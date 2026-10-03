// Character Sheet: the page. Draws the sheet from the character (sheet.js has the rules) and
// saves every change to this browser's localStorage.
(function () {
  const S = window.Sheet;
  const $ = (id) => document.getElementById(id);

  // localStorage can be blocked (private windows, some file:// setups): fall back to memory.
  let store;
  try { store = window.localStorage; store.getItem(S.STORE); }
  catch { const m = new Map(); store = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }; }

  let all = S.loadAll(store);
  let s = all.chars[all.current];
  let peek = null; // the section whose + is open
  const openEntries = new Set();
  let derived = []; // redraws numbers that follow the stats (skills, Initiative)

  // --- Helpers ----------------------------------------------------------------------
  function h(tag, props, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k in n && typeof v !== 'string') n[k] = v;
      else if (k === 'value') n.value = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => c != null && c !== false && n.append(c));
    return n;
  }
  const ICON = {
    heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    plus: 'M12 2a10 10 0 100 20 10 10 0 000-20zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
    drop: 'M12 2C8 7 5 10.5 5 14a7 7 0 0014 0c0-3.5-3-7-7-12z',
    skull: 'M12 2C6.5 2 3 5.6 3 10.2c0 2.6 1.2 4.7 3 6V19a1 1 0 001 1h2v-2h2v2h2v-2h2v2h2a1 1 0 001-1v-2.8c1.8-1.3 3-3.4 3-6C21 5.6 17.5 2 12 2zM8.5 14a2 2 0 110-4 2 2 0 010 4zm7 0a2 2 0 110-4 2 2 0 010 4z',
    chevron: 'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z',
    close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  };
  const icon = (name, cls = 'cs-ic') => {
    const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    n.setAttribute('viewBox', '0 0 24 24');
    n.setAttribute('class', cls);
    n.setAttribute('aria-hidden', 'true');
    n.innerHTML = `<path d="${ICON[name]}" fill="currentColor"/>`;
    return n;
  };
  const get = (path) => path.split('.').reduce((o, k) => o[k], s);
  const set = (path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], s)[last] = v; };

  // --- Saving -----------------------------------------------------------------------
  let timer = null;
  function commit() {
    all.chars[s.id] = s;
    all.current = s.id;
    clearTimeout(timer);
    timer = setTimeout(() => S.saveAll(store, all), 250);
  }
  const flush = () => { clearTimeout(timer); S.saveAll(store, all); };
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  const refresh = () => derived.forEach((f) => f());

  // --- Inputs -----------------------------------------------------------------------
  function text(path, label, cls = '') {
    const inp = h('input', { class: 'cs-in ' + cls, value: get(path), 'aria-label': label, spellcheck: false });
    inp.addEventListener('input', () => {
      set(path, inp.value);
      commit();
      if (path === 'name') names();
    });
    return inp;
  }
  // Calculator box: "-4" / "+3" change it, "13-4" sets it. Applied on Enter or leaving the box.
  function calc(getV, setV, label, cls = '', after) {
    const inp = h('input', { class: 'cs-in ' + cls, value: getV(), 'aria-label': label, inputMode: 'text', spellcheck: false });
    let start = inp.value;
    inp.addEventListener('focus', () => { start = inp.value; });
    const apply = () => {
      if (inp.value === start) return;
      const r = S.applyMath(inp.value, start);
      const v = r === null ? inp.value : r;
      inp.value = v;
      start = v;
      setV(v);
      commit();
      if (after) after();
    };
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { apply(); inp.blur(); }
      if (ev.key === 'Escape') { inp.value = start; inp.blur(); }
    });
    inp.addEventListener('blur', apply);
    return inp;
  }
  // Whole numbers (stats).
  function whole(getV, setV, label, cls = '') {
    const inp = h('input', { class: 'cs-in ' + cls, value: String(getV()), 'aria-label': label, inputMode: 'numeric' });
    inp.addEventListener('input', () => {
      const n = parseInt(inp.value, 10);
      if (Number.isFinite(n)) { setV(n); commit(); refresh(); }
    });
    inp.addEventListener('blur', () => { inp.value = String(getV()); });
    return inp;
  }
  // A number that follows a stat (skills, Initiative): typing a total stores the difference.
  function follows(total, setTotal, label, cls = '') {
    const inp = whole(total, setTotal, label, cls);
    derived.push(() => { if (document.activeElement !== inp) inp.value = String(total()); });
    return inp;
  }

  // --- Sections and their + -----------------------------------------------------------
  const TITLES = { header: 'Details', stats: 'Stats', defense: 'Defense', skills: 'Skills' };
  function section(name, cls, ...content) {
    const open = peek === name;
    const n = S.SECTIONS[name] ? s.extras[name].length : 0;
    const more = h('button', {
      type: 'button', class: 'cs-peek' + (open ? ' on' : ''), title: open ? 'Close' : `More ${TITLES[name].toLowerCase()}`,
      'aria-label': open ? 'Close' : `More ${TITLES[name].toLowerCase()}`, 'aria-expanded': String(open),
      onclick: () => { peek = open ? null : name; render(); },
    }, open ? icon('close', 'cs-ic sm') : '+', !open && n ? h('span', { class: 'cs-n' }, String(n)) : null);
    return h('section', { class: `cs-sec ${cls}${open ? ' editing' : ''}` }, ...content, more, open ? popover(name) : null);
  }
  // While a section's + is open its boxes get a × to take them off the sheet.
  function removable(name, id, node) {
    if (peek === name) {
      node.append(h('button', {
        type: 'button', class: 'cs-x left', title: 'Remove', 'aria-label': 'Remove',
        onclick: () => { s = S.setRemoved(s, name, id, true); commit(); render(); },
      }, icon('close', 'cs-ic xs')));
    }
    return node;
  }
  const shown = (name) => S.SECTIONS[name].filter((id) => !S.isRemoved(s, name, id));

  const DEFAULT_NAMES = {
    header: { name: 'Character Name', origin: 'Ancestry, Class, & Level', sizeSpeed: 'Size & Speed', heightWeight: 'Height & Weight', hitDice: 'Hit Dice' },
    stats: Object.fromEntries(S.STATS.map((x) => [x.id, x.name])),
    defense: { armor: 'Armor', initiative: 'Initiative', wounds: 'Wounds' },
    skills: Object.fromEntries(S.SKILLS.map((x) => [x.id, x.name])),
  };

  function popover(name) {
    const boxes = s.extras[name].map((b, i) => extraBox(name, b, i));
    const gone = S.SECTIONS[name].filter((id) => S.isRemoved(s, name, id)).map((id) => h('button', {
      type: 'button', class: 'cs-addb restore', onclick: () => { s = S.setRemoved(s, name, id, false); commit(); render(); },
    }, '↺ ', DEFAULT_NAMES[name][id]));
    const add = (type, label) => h('button', {
      type: 'button', class: 'cs-addb',
      onclick: () => { const b = S.newBox(name, type); s.extras[name].push(b); commit(); render(); focusBox(b.id); },
    }, '+ ', label);
    const adds = name === 'skills' ? [add('skill', 'Skill')] : [add('num', 'Number'), add('text', 'Text'), add('pair', 'Current / Max')];
    return h('div', { class: 'cs-pop', role: 'dialog', 'aria-label': TITLES[name] },
      h('div', { class: 'cs-pop-title' }, TITLES[name]),
      boxes.length ? h('div', { class: 'cs-xgrid' }, boxes) : null,
      name === 'defense' ? woundsSetting() : null,
      h('div', { class: 'cs-adds' }, adds, gone));
  }
  function focusBox(id) {
    setTimeout(() => { const n = document.querySelector(`[data-box="${id}"] .cs-xlabel`); if (n) n.focus(); }, 0);
  }
  function extraBox(name, b, i) {
    const list = s.extras[name];
    const label = h('input', { class: 'cs-xlabel', value: b.label, 'aria-label': 'Label', placeholder: 'Label', spellcheck: false,
      oninput: (ev) => { b.label = ev.target.value; commit(); } });
    let body;
    if (b.type === 'text') body = h('input', { class: 'cs-in', value: b.value, 'aria-label': b.label || 'Text', oninput: (ev) => { b.value = ev.target.value; commit(); } });
    else if (b.type === 'pair') {
      body = h('div', { class: 'cs-pair' },
        calc(() => b.value, (v) => { b.value = v; }, (b.label || 'Value') + ' current', 'cs-big'),
        h('span', { class: 'cs-slash' }),
        h('input', { class: 'cs-in cs-big', value: b.max, 'aria-label': (b.label || 'Value') + ' max', oninput: (ev) => { b.max = ev.target.value; commit(); } }));
    } else if (b.type === 'skill') {
      const stat = h('select', { class: 'cs-xstat', 'aria-label': 'Stat', onchange: (ev) => { b.stat = ev.target.value; commit(); refresh(); } },
        S.STATS.map((x) => h('option', { value: x.id, selected: x.id === b.stat }, x.name)));
      body = h('div', { class: 'cs-xskill' }, stat,
        follows(() => S.boxSkillTotal(s, b), (v) => { b.points = S.pointsFor(v, S.statVal(s, b.stat)); }, b.label || 'Skill', 'cs-big'));
    } else body = calc(() => b.value, (v) => { b.value = v; }, b.label || 'Number', 'cs-big');
    const del = h('button', {
      type: 'button', class: 'cs-x', title: 'Delete', 'aria-label': 'Delete',
      onclick: () => {
        const filled = b.label || b.value || b.max || b.points;
        if (filled && !confirm(`Delete "${b.label || 'this box'}"?`)) return;
        s.extras[name] = list.filter((x) => x !== b);
        commit(); render();
      },
    }, icon('close', 'cs-ic xs'));
    // Drag a box to reorder it.
    const box = h('div', { class: `cs-xbox t-${b.type}`, 'data-box': b.id, draggable: 'true' }, label, body, del);
    box.addEventListener('dragstart', (ev) => {
      if (ev.target.closest('input, select, textarea')) { ev.preventDefault(); return; }
      ev.dataTransfer.setData('text/x-box', String(i));
      ev.dataTransfer.effectAllowed = 'move';
    });
    box.addEventListener('dragover', (ev) => { if (ev.dataTransfer.types.includes('text/x-box')) { ev.preventDefault(); box.classList.add('drop'); } });
    box.addEventListener('dragleave', () => box.classList.remove('drop'));
    box.addEventListener('drop', (ev) => {
      ev.preventDefault();
      const from = parseInt(ev.dataTransfer.getData('text/x-box'), 10);
      if (Number.isFinite(from) && from !== i) { s.extras[name] = S.move(list, from, i); commit(); }
      render();
    });
    return box;
  }
  function woundsSetting() {
    const step = (d) => { s.woundsMax = Math.max(1, Math.min(20, s.woundsMax + d)); s.wounds = Math.min(s.wounds, s.woundsMax); commit(); render(); };
    return h('div', { class: 'cs-setting' },
      h('span', { class: 'cs-setlabel' }, 'Max Wounds'),
      h('div', { class: 'stepper' },
        h('button', { type: 'button', 'aria-label': 'Fewer wounds', onclick: () => step(-1) }, '−'),
        h('input', { value: String(s.woundsMax), readOnly: true, 'aria-label': 'Max wounds', tabIndex: -1 }),
        h('button', { type: 'button', 'aria-label': 'More wounds', onclick: () => step(1) }, '+')));
  }

  // --- The sheet ----------------------------------------------------------------------
  const HEAD = {
    name: { inputs: [['name', 'Character name']], grow: 1.6 },
    origin: { inputs: [['ancestry', 'Ancestry'], ['cls', 'Class'], ['level', 'Level', 'narrow']], grow: 2.6 },
    sizeSpeed: { inputs: [['size', 'Size'], ['speed', 'Speed']], grow: 1.5 },
    heightWeight: { inputs: [['height', 'Height'], ['weight', 'Weight']], grow: 1.5 },
    hitDice: { inputs: [['hitDice.cur', 'Hit dice left', 'narrow'], ['hitDice.die', 'Hit die']], grow: 1, slash: true },
  };
  function headGroup(id) {
    const g = HEAD[id];
    const ins = [];
    g.inputs.forEach(([path, label, cls], k) => {
      if (g.slash && k) ins.push(h('span', { class: 'cs-hslash' }, '/'));
      ins.push(text(path, label, cls));
    });
    return removable('header', id, h('div', { class: 'cs-hgroup', style: `--g:${g.grow}` },
      h('div', { class: 'cs-hin' }, ins),
      h('div', { class: 'cs-hlabel' }, DEFAULT_NAMES.header[id])));
  }
  function header() {
    const ids = shown('header');
    const left = ids.filter((id) => id === 'name' || id === 'origin');
    const right = ids.filter((id) => !left.includes(id));
    return section('header', 'cs-head',
      h('div', { class: 'cs-hl' }, left.map(headGroup)),
      h('div', { class: 'cs-hgap' }),
      h('div', { class: 'cs-hr' }, right.map(headGroup)));
  }

  function hitPoints() {
    const cur = calc(() => s.hp.cur, (v) => { s.hp.cur = v; }, 'Hit points', 'cs-big', () => blood());
    const max = h('input', { class: 'cs-in cs-big', value: s.hp.max, 'aria-label': 'Max hit points', oninput: (ev) => { s.hp.max = ev.target.value; commit(); blood(); } });
    const blood = () => cur.classList.toggle('bloodied', S.bloodied(s.hp));
    blood();
    return h('div', { class: 'cs-hp' },
      h('div', { class: 'cs-hp-a' },
        icon('heart', 'cs-ic cs-heart'),
        h('div', { class: 'cs-cap' }, 'Hit Points'),
        h('div', { class: 'cs-pair' }, cur, h('span', { class: 'cs-slash' }), max)),
      h('div', { class: 'cs-hp-b' },
        h('div', { class: 'cs-cap sm' }, icon('plus', 'cs-ic'), 'Temp HP'),
        calc(() => s.hp.temp, (v) => { s.hp.temp = v; }, 'Temp HP', 'cs-big')));
  }

  function stats() {
    const ids = shown('stats');
    return section('stats', 'cs-stats', h('div', { class: 'cs-statrow', style: `--n:${Math.max(1, ids.length)}` }, ids.map((id) => {
      const st = s.stats[id];
      const name = DEFAULT_NAMES.stats[id];
      const save = (which) => h('button', {
        type: 'button', class: `cs-save ${which}${st.save === which ? ' on' : ''}`, 'aria-pressed': String(st.save === which),
        title: which === 'adv' ? 'Save advantage' : 'Save disadvantage', 'aria-label': `${name} save ${which === 'adv' ? 'advantage' : 'disadvantage'}`,
        onclick: () => { st.save = S.toggleSave(st.save, which); commit(); render(); },
      });
      const key = h('input', { type: 'checkbox', class: 'cs-check', checked: st.key, 'aria-label': `${name} key stat`, title: 'Key stat',
        onchange: (ev) => { st.key = ev.target.checked; commit(); } });
      return removable('stats', id, h('div', { class: 'cs-statw' },
        h('div', { class: 'cs-stat' },
          save('adv'),
          whole(() => st.val, (v) => { st.val = v; }, name, 'cs-big'),
          h('label', { class: 'cs-statname' }, key, name)),
        save('dis')));
    })));
  }

  function defense() {
    const boxes = shown('defense').map((id) => {
      if (id === 'armor') return removable('defense', id, h('div', { class: 'cs-dbox' }, h('div', { class: 'cs-cap' }, 'Armor'), text('armor', 'Armor', 'cs-big')));
      if (id === 'initiative') {
        return removable('defense', id, h('div', { class: 'cs-dbox' }, h('div', { class: 'cs-cap' }, 'Initiative'),
          follows(() => S.initiative(s), (v) => { s.initBonus = S.pointsFor(v, S.statVal(s, 'dex')); }, 'Initiative', 'cs-big')));
      }
      return removable('defense', id, wounds());
    });
    return section('defense', 'cs-def', boxes);
  }
  function wounds() {
    const dots = [];
    for (let i = 0; i < s.woundsMax; i++) {
      const last = i === s.woundsMax - 1;
      const on = i < s.wounds;
      dots.push(h('button', {
        type: 'button', class: 'cs-dot' + (on ? ' on' : '') + (last ? ' skull' : ''), 'aria-pressed': String(on),
        'aria-label': `Wound ${i + 1}`, onclick: () => { s.wounds = S.setWounds(s.wounds, i); commit(); render(); },
      }, last ? icon('skull', 'cs-ic') : null));
    }
    return h('div', { class: 'cs-woundw' },
      h('div', { class: 'cs-wounds' + (s.wounds >= s.woundsMax ? ' dead' : '') },
        h('div', { class: 'cs-wcap' }, icon('drop', 'cs-ic'), 'Wounds'),
        h('div', { class: 'cs-track' }, dots)),
      h('div', { class: 'cs-marks' }, s.woundMarks.map((m, i) => h('input', {
        type: 'checkbox', class: 'cs-mark', checked: m, 'aria-label': `Mark ${i + 1}`,
        onchange: (ev) => { s.woundMarks[i] = ev.target.checked; commit(); },
      }))));
  }

  function skills() {
    return section('skills', 'cs-skills', h('div', { class: 'cs-band' }, shown('skills').map((id) => {
      const sk = S.SKILLS.find((x) => x.id === id);
      const pts = h('span', { class: 'cs-pts' });
      const showPts = () => { const p = s.skills[id]; pts.textContent = p ? (p > 0 ? `+${p}` : String(p)) : ''; };
      derived.push(showPts);
      showPts();
      return removable('skills', id, h('div', { class: 'cs-skill' },
        h('span', { class: 'cs-sst' }, DEFAULT_NAMES.stats[sk.stat]), pts,
        follows(() => S.skillTotal(s, id), (v) => { s.skills[id] = S.pointsFor(v, S.statVal(s, sk.stat)); }, sk.name, 'cs-big'),
        h('span', { class: 'cs-snm' }, sk.name)));
    })));
  }

  // Notes: free text on the left, collapsible entries on the right.
  function notes() {
    const free = h('textarea', { class: 'cs-free', 'aria-label': 'Notes', value: s.notes, oninput: (ev) => { s.notes = ev.target.value; commit(); } });
    const add = h('button', {
      type: 'button', class: 'cs-addb wide',
      onclick: () => {
        const e = { id: S.uid(), title: '', body: '' };
        s.entries.push(e);
        openEntries.add(e.id);
        commit(); render();
        setTimeout(() => { const n = document.querySelector(`[data-entry="${e.id}"] .cs-etitle`); if (n) n.focus(); }, 0);
      },
    }, '+ Entry');
    return h('div', { class: 'cs-notes' },
      h('div', { class: 'cs-panel' }, free),
      h('div', { class: 'cs-panel cs-entries' }, s.entries.map(entry), add));
  }
  function grow(t) { t.style.height = 'auto'; t.style.height = Math.max(90, t.scrollHeight + 2) + 'px'; }
  function entry(e, i) {
    const open = openEntries.has(e.id);
    const toggle = () => { if (open) openEntries.delete(e.id); else openEntries.add(e.id); render(); };
    const title = open
      ? h('input', { class: 'cs-etitle', value: e.title, 'aria-label': 'Title', placeholder: 'Title', spellcheck: false,
        oninput: (ev) => { e.title = ev.target.value; commit(); }, onkeydown: (ev) => { if (ev.key === 'Enter') ev.target.blur(); } })
      : h('span', { class: 'cs-etitle' + (e.title ? '' : ' none') }, e.title || 'Untitled');
    const del = open ? h('button', {
      type: 'button', class: 'cs-edel', title: 'Delete', 'aria-label': 'Delete entry',
      onclick: () => {
        if ((e.title || e.body) && !confirm(`Delete "${e.title || 'Untitled'}"?`)) return;
        s.entries = s.entries.filter((x) => x !== e);
        openEntries.delete(e.id);
        commit(); render();
      },
    }, icon('close', 'cs-ic sm')) : null;
    const bar = h('div', {
      class: 'cs-ebar', role: 'button', tabIndex: 0, 'aria-expanded': String(open),
      onclick: (ev) => { if (!ev.target.closest('input, button')) toggle(); },
      onkeydown: (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === bar) { ev.preventDefault(); toggle(); } },
    }, icon('chevron', 'cs-ic cs-chev'), title, del);
    const node = h('div', { class: 'cs-entry' + (open ? ' open' : ''), 'data-entry': e.id }, bar);
    if (open) {
      const body = h('textarea', { class: 'cs-ebody', 'aria-label': e.title || 'Entry', value: e.body, oninput: (ev) => { e.body = ev.target.value; commit(); grow(ev.target); } });
      node.append(body);
      setTimeout(() => grow(body), 0);
    }
    // Drag an entry by its bar to reorder.
    bar.draggable = true;
    bar.addEventListener('dragstart', (ev) => {
      if (ev.target.closest && ev.target.closest('input')) { ev.preventDefault(); return; }
      ev.dataTransfer.setData('text/x-entry', String(i));
      ev.dataTransfer.effectAllowed = 'move';
    });
    node.addEventListener('dragover', (ev) => { if (ev.dataTransfer.types.includes('text/x-entry')) { ev.preventDefault(); node.classList.add('drop'); } });
    node.addEventListener('dragleave', () => node.classList.remove('drop'));
    node.addEventListener('drop', (ev) => {
      ev.preventDefault();
      const from = parseInt(ev.dataTransfer.getData('text/x-entry'), 10);
      if (Number.isFinite(from) && from !== i) { s.entries = S.move(s.entries, from, i); commit(); }
      render();
    });
    return node;
  }

  function render() {
    derived = [];
    $('sheet').replaceChildren(header(), hitPoints(), stats(), defense(), skills(), notes());
    refresh();
  }

  // An open + closes when you click elsewhere or press Esc.
  document.addEventListener('pointerdown', (ev) => {
    if (peek && !ev.target.closest('.cs-sec.editing, .cs-peek')) { peek = null; render(); }
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && peek) { peek = null; render(); } });

  // --- Characters -----------------------------------------------------------------------
  function names() {
    const sel = $('who');
    const list = Object.values(all.chars);
    sel.replaceChildren(...list.map((c) => h('option', { value: c.id, selected: c.id === s.id }, c.name || 'Unnamed')));
  }
  function show(c) {
    all.chars[c.id] = c;
    s = c;
    peek = null;
    openEntries.clear();
    commit();
    names();
    render();
  }
  $('who').addEventListener('change', (ev) => show(all.chars[ev.target.value]));
  $('new').addEventListener('click', () => show(S.blank()));
  $('copy').addEventListener('click', () => {
    const c = S.normalize(JSON.parse(JSON.stringify(s)));
    c.id = S.uid();
    c.name = (s.name || 'Unnamed') + ' (copy)';
    show(c);
  });
  $('delete').addEventListener('click', () => {
    if (!confirm(`Delete ${s.name || 'this character'}?`)) return;
    delete all.chars[s.id];
    const next = Object.values(all.chars)[0] || S.blank();
    show(next);
  });
  $('export').addEventListener('click', () => {
    const blob = new Blob([S.exportJson(s)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `${(s.name || 'character').replace(/[^\w\- ]+/g, '').trim() || 'character'}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    try { show(S.importJson(await file.text())); }
    catch (err) { alert(`Couldn't import ${file.name}: ${err.message}`); }
  });
  $('print').addEventListener('click', () => { peek = null; render(); window.print(); });

  names();
  render();
  commit();
})();
