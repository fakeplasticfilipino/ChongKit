// Character Sheet: the page. Draws the sheet from the character (sheet.js has the rules) and
// saves every change to this browser's localStorage.
// Two modes: playing (fill it in; a section's + shows its extra boxes) and Edit layout (add,
// remove, restore and reorder boxes, tabs and entries). Every removal can be undone (toast or Ctrl+Z).
(function () {
  const S = window.Sheet;
  const $ = (id) => document.getElementById(id);

  // localStorage can be blocked (private windows, some file:// setups): fall back to memory.
  let store;
  try { store = window.localStorage; store.getItem(S.STORE); }
  catch { const m = new Map(); store = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }; }

  let all = S.loadAll(store);
  let s = all.chars[all.current];
  let editing = false; // Edit layout
  let tray = null; // the section whose + is open
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
    skull: 'M12 2C6.5 2 3 5.6 3 10.2c0 2.6 1.2 4.7 3 6V19a1 1 0 001 1h2v-2h2v2h2v-2h2v2h2a1 1 0 001-1v-2.8c1.8-1.3 3-3.4 3-6C21 5.6 17.5 2 12 2zM8.5 14a2 2 0 110-4 2 2 0 010 4zm7 0a2 2 0 110-4 2 2 0 010 4z',
    chevron: 'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z',
    close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    grip: 'M9 4a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM9 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM9 16a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z',
    undo: 'M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62A7.95 7.95 0 0112.5 10.5c3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
  };
  const icon = (name, cls = 'cs-ic') => {
    const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    n.setAttribute('viewBox', '0 0 24 24');
    n.setAttribute('class', cls);
    n.setAttribute('aria-hidden', 'true');
    n.innerHTML = `<path d="${ICON[name]}" fill="currentColor"/>`;
    return n;
  };
  // The Armor shield, drawn like the sheet's: a thick outline with a thin one inside.
  const shield = () => {
    const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    n.setAttribute('viewBox', '0 0 100 116');
    n.setAttribute('aria-hidden', 'true');
    n.innerHTML = '<path d="M50 4 L94 17 V56 C94 84 74 102 50 112 C26 102 6 84 6 56 V17 Z" fill="#fff" stroke="currentColor" stroke-width="3"/>'
      + '<path d="M50 12 L86 23 V56 C86 79 70 94 50 103 C30 94 14 79 14 56 V23 Z" fill="none" stroke="currentColor" stroke-width="1"/>';
    return n;
  };
  const get = (path) => path.split('.').reduce((o, k) => o[k], s);
  const set = (path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], s)[last] = v; };
  const typing = () => { const a = document.activeElement; return !!a && a.matches('input, textarea, select'); };

  // --- Saving -----------------------------------------------------------------------
  let timer = null, savedTimer = null;
  function commit() {
    all.chars[s.id] = s;
    all.current = s.id;
    clearTimeout(timer);
    timer = setTimeout(save, 300);
  }
  function save() {
    clearTimeout(timer);
    const ok = S.saveAll(store, all);
    const n = $('saved');
    n.textContent = ok ? 'Saved' : 'Not saved';
    n.classList.toggle('bad', !ok);
    n.classList.add('show');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => n.classList.remove('show'), 1400);
  }
  window.addEventListener('pagehide', () => S.saveAll(store, all));
  const refresh = () => derived.forEach((f) => f());

  // --- Undo -------------------------------------------------------------------------
  // Structural changes (remove, delete, add, move) go through change(): one snapshot each.
  let history = [];
  let toastTimer = null;
  function change(label, fn) {
    history.push(JSON.stringify(s));
    if (history.length > 60) history.shift();
    fn();
    commit();
    render();
    if (label) toast(label);
  }
  function undo() {
    const prev = history.pop();
    if (!prev) return;
    s = S.normalize(S.undoLayout(JSON.parse(prev), s));
    all.chars[s.id] = s;
    commit();
    render();
    hideToast();
  }
  function toast(label) {
    const t = $('toast');
    t.replaceChildren(h('span', {}, label), h('button', { type: 'button', class: 'cs-undo', onclick: undo }, icon('undo', 'cs-ic sm'), 'Undo'));
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 6000);
  }
  function hideToast() { $('toast').hidden = true; }
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key.toLowerCase() === 'z' && !typing() && history.length) {
      ev.preventDefault();
      undo();
    }
  });

  // --- Inputs -----------------------------------------------------------------------
  // ↑ / ↓ step a number box by 1 (Shift: 5).
  function stepper(inp, onStep) {
    inp.addEventListener('keydown', (ev) => {
      if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
      const cur = parseFloat(inp.value);
      const by = (ev.key === 'ArrowUp' ? 1 : -1) * (ev.shiftKey ? 5 : 1);
      ev.preventDefault();
      onStep(String((Number.isFinite(cur) ? Math.trunc(cur) : 0) + by));
    });
  }
  function text(path, label, cls = '') {
    const inp = h('input', { class: 'cs-in ' + cls, value: get(path), 'aria-label': label, spellcheck: false,
      onkeydown: (ev) => { if (ev.key === 'Enter') inp.blur(); } });
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
    stepper(inp, (v) => { inp.value = v; start = v; setV(v); commit(); if (after) after(); });
    inp.addEventListener('blur', apply);
    return inp;
  }
  // Whole numbers (stats).
  function whole(getV, setV, label, cls = '') {
    const inp = h('input', { class: 'cs-in ' + cls, value: String(getV()), 'aria-label': label, inputMode: 'numeric',
      onkeydown: (ev) => { if (ev.key === 'Enter') inp.blur(); } });
    const take = (v) => { const n = parseInt(v, 10); if (Number.isFinite(n)) { setV(n); commit(); refresh(); } };
    inp.addEventListener('input', () => take(inp.value));
    stepper(inp, (v) => { inp.value = v; take(v); });
    inp.addEventListener('blur', () => { inp.value = String(getV()); });
    return inp;
  }
  // A number that follows a stat (skills, Initiative): typing a total stores the difference.
  function follows(total, setTotal, label, cls = '', tip) {
    const inp = whole(total, setTotal, label, cls);
    derived.push(() => {
      if (document.activeElement !== inp) inp.value = String(total());
      if (tip) inp.title = tip();
    });
    return inp;
  }
  const statName = (id) => (S.STATS.find((x) => x.id === id) || {}).name || '';

  // --- Sections, trays, edit layout -------------------------------------------------------
  const TITLES = { header: 'Details', stats: 'Stats', saves: 'Saves', combat: 'Combat', skills: 'Skills' };
  const DEFAULT_NAMES = {
    header: { name: 'Character Name', cls: 'Class & Level', ancestry: 'Ancestry', height: 'Height', weight: 'Weight', hitDice: 'Hit Dice' },
    stats: Object.fromEntries(S.STATS.map((x) => [x.id, x.name])),
    saves: Object.fromEntries(S.SAVES.map((x) => [x.id, `${x.name} save`])),
    combat: { armor: 'Armor', hp: 'Hit Points', initSpeed: 'Initiative & Speed', wounds: 'Wounds' },
    skills: Object.fromEntries(S.SKILLS.map((x) => [x.id, x.name])),
  };
  const shown = (name) => S.SECTIONS[name].filter((id) => !S.isRemoved(s, name, id));
  const removedIn = (name) => S.SECTIONS[name].filter((id) => S.isRemoved(s, name, id));

  // A section: a framed panel with its side label (or a label on the top edge), and the + tab
  // that shows how many extra boxes are tucked away. Playing, the + only appears when there's
  // something there; in Edit layout it's always there (to add boxes).
  function section(name, cls, label, ...content) {
    const open = tray === name;
    const n = s.extras[name].length;
    const tab = (editing || n || open) ? h('button', {
      type: 'button', class: 'cs-more' + (open ? ' on' : ''), 'aria-expanded': String(open),
      title: open ? 'Close' : `More ${TITLES[name].toLowerCase()}`, 'aria-label': open ? 'Close' : `More ${TITLES[name].toLowerCase()}`,
      onclick: () => { tray = open ? null : name; render(); },
    }, open ? icon('close', 'cs-ic sm') : h('span', { class: 'cs-plus' }, '+'), !open && n ? h('span', {}, String(n)) : null) : null;
    const lab = label === 'side' ? h('div', { class: 'cs-vl' }, h('span', {}, TITLES[name]))
      : label === 'top' ? h('span', { class: 'cs-legend' }, TITLES[name]) : null;
    return h('section', { class: `cs-sec ${cls}${open ? ' tray-open' : ''}` }, lab, ...content, tab, open ? trayFor(name) : null);
  }
  // In Edit layout every default box gets a × that takes it off the sheet (into its tray).
  function removable(name, id, node) {
    node.classList.add('cs-box');
    if (editing) {
      node.append(h('button', {
        type: 'button', class: 'cs-x', title: 'Remove', 'aria-label': `Remove ${DEFAULT_NAMES[name][id]}`,
        onclick: () => change(`Removed ${DEFAULT_NAMES[name][id]}`, () => { s = S.setRemoved(s, name, id, true); }),
      }, icon('close', 'cs-ic xs')));
    }
    return node;
  }

  function trayFor(name) {
    const boxes = s.extras[name].map((b, i) => extraBox(name, b, i));
    const parts = [h('div', { class: 'cs-tray-title' }, TITLES[name])];
    if (boxes.length) parts.push(h('div', { class: 'cs-xgrid' }, boxes));
    if (editing) {
      if (name === 'combat') parts.push(woundsSetting());
      const add = (type, label) => h('button', {
        type: 'button', class: 'cs-addb',
        onclick: () => {
          const b = S.newBox(name, type);
          change(null, () => { s.extras[name].push(b); });
          focusBox(b.id);
        },
      }, '+ ', label);
      const adds = name === 'skills' ? [add('skill', 'Skill')] : [add('num', 'Number'), add('text', 'Text'), add('pair', 'Current / Max')];
      const gone = removedIn(name).map((id) => h('button', {
        type: 'button', class: 'cs-addb restore', title: 'Put back',
        onclick: () => change(null, () => { s = S.setRemoved(s, name, id, false); }),
      }, icon('undo', 'cs-ic sm'), DEFAULT_NAMES[name][id]));
      parts.push(h('div', { class: 'cs-adds' }, adds));
      if (gone.length) parts.push(h('div', { class: 'cs-gone' }, h('span', { class: 'cs-gone-label' }, 'Removed'), gone));
    } else if (!boxes.length) parts.push(h('div', { class: 'cs-adds' }, h('button', { type: 'button', class: 'cs-addb', onclick: () => setEditing(true) }, 'Edit layout')));
    return h('div', { class: 'cs-tray', role: 'dialog', 'aria-label': TITLES[name] }, parts);
  }
  function focusBox(id) {
    setTimeout(() => { const n = document.querySelector(`[data-box="${id}"] .cs-xlabel`); if (n) n.focus(); }, 0);
  }
  // Drag to reorder: the grip starts it, items in the same list accept the drop.
  function draggable(grip, node, kind, i, onMove) {
    grip.addEventListener('dragstart', (ev) => { ev.dataTransfer.setData('text/plain', `${kind}|${i}`); ev.dataTransfer.effectAllowed = 'move'; node.classList.add('dragging'); dragKind = kind; });
    grip.addEventListener('dragend', () => { node.classList.remove('dragging'); dragKind = null; });
    node.addEventListener('dragover', (ev) => { if (dragKind === kind) { ev.preventDefault(); node.classList.add('drop'); } });
    node.addEventListener('dragleave', () => node.classList.remove('drop'));
    node.addEventListener('drop', (ev) => {
      ev.preventDefault();
      const [k, n] = ev.dataTransfer.getData('text/plain').split('|');
      const from = parseInt(n, 10);
      if (k === kind && Number.isFinite(from) && from !== i) onMove(from, i);
      else render();
    });
  }
  let dragKind = null;

  function extraBox(name, b, i) {
    const label = editing
      ? h('input', { class: 'cs-xlabel', value: b.label, 'aria-label': 'Label', placeholder: 'Label', spellcheck: false,
        oninput: (ev) => { b.label = ev.target.value; commit(); }, onkeydown: (ev) => { if (ev.key === 'Enter') ev.target.blur(); } })
      : h('div', { class: 'cs-xlabel' }, b.label || '—');
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
        follows(() => S.boxSkillTotal(s, b), (v) => { b.points = S.pointsFor(v, S.statVal(s, b.stat)); }, b.label || 'Skill', 'cs-big',
          () => `${statName(b.stat)} ${S.statVal(s, b.stat)} + ${b.points || 0}`));
    } else body = calc(() => b.value, (v) => { b.value = v; }, b.label || 'Number', 'cs-big');
    const box = h('div', { class: `cs-xbox t-${b.type}`, 'data-box': b.id }, body, label);
    if (editing) {
      box.append(h('button', {
        type: 'button', class: 'cs-x', title: 'Delete', 'aria-label': `Delete ${b.label || 'box'}`,
        onclick: () => change(`Deleted ${b.label || 'box'}`, () => { s.extras[name] = s.extras[name].filter((x) => x.id !== b.id); }),
      }, icon('close', 'cs-ic xs')));
      const grip = h('span', { class: 'cs-grip', title: 'Drag to move', draggable: 'true' }, icon('grip', 'cs-ic sm'));
      box.append(grip);
      draggable(grip, box, 'box-' + name, i, (from, to) => change(null, () => { s.extras[name] = S.move(s.extras[name], from, to); }));
    }
    return box;
  }
  function woundsSetting() {
    const step = (d) => change(null, () => { s.woundsMax = Math.max(1, Math.min(20, s.woundsMax + d)); s.wounds = Math.min(s.wounds, s.woundsMax); });
    return h('div', { class: 'cs-setting' },
      h('span', { class: 'cs-setlabel' }, 'Max Wounds'),
      h('div', { class: 'stepper' },
        h('button', { type: 'button', 'aria-label': 'Fewer wounds', onclick: () => step(-1) }, '−'),
        h('input', { value: String(s.woundsMax), readOnly: true, 'aria-label': 'Max wounds', tabIndex: -1 }),
        h('button', { type: 'button', 'aria-label': 'More wounds', onclick: () => step(1) }, '+')));
  }

  // --- The sheet ----------------------------------------------------------------------
  // Details: the name on a banner, then class, ancestry, height and weight on lines, and Hit Dice.
  function header() {
    const ids = shown('header');
    const lines = ids.filter((id) => ['cls', 'ancestry', 'height', 'weight'].includes(id)).map((id) => removable('header', id,
      h('label', { class: 'cs-lf' }, h('span', { class: 'cs-sub' }, DEFAULT_NAMES.header[id]), text(id, DEFAULT_NAMES.header[id], 'cs-line'))));
    const parts = [];
    if (ids.includes('name')) {
      parts.push(removable('header', 'name', h('div', { class: 'cs-ribbon' },
        h('div', { class: 'cs-banner' }, h('div', { class: 'cs-banner-in' }, text('name', 'Character name', 'cs-name'))),
        h('span', { class: 'cs-sub' }, 'Character Name'))));
    }
    const details = [];
    if (lines.length) details.push(h('div', { class: 'cs-dgrid' }, lines));
    if (ids.includes('hitDice')) {
      details.push(removable('header', 'hitDice', h('div', { class: 'cs-hd' },
        h('span', { class: 'cs-sub' }, 'Hit Dice'),
        h('div', { class: 'cs-hdbox cs-rbox' }, text('hitDice.cur', 'Hit dice left', 'cs-num'), h('span', { class: 'cs-hslash' }, '/'), text('hitDice.die', 'Hit die', 'cs-num')))));
    }
    if (details.length) parts.push(h('div', { class: 'cs-details' }, details));
    return section('header', 'cs-head', null, parts);
  }

  // Stats: a big number, a small number in the oval, and the name (click it to mark a key stat).
  function stats() {
    const ids = shown('stats');
    return section('stats', 'cs-pnl cs-stats', 'side', h('div', { class: 'cs-statrow', style: `--n:${Math.max(1, ids.length)}` }, ids.map((id) => {
      const st = s.stats[id];
      const name = DEFAULT_NAMES.stats[id];
      return removable('stats', id, h('div', { class: 'cs-stat' },
        h('div', { class: 'cs-sbox cs-rbox' },
          whole(() => st.val, (v) => { st.val = v; refresh(); }, name, 'cs-num'),
          calc(() => st.slot, (v) => { st.slot = v; }, `${name} small number`, 'cs-oval')),
        h('button', {
          type: 'button', class: 'cs-sname' + (st.key ? ' on' : ''), 'aria-pressed': String(st.key), title: 'Key stat', 'aria-label': `${name} key stat`,
          onclick: () => { st.key = !st.key; commit(); render(); },
        }, name)));
    })));
  }

  // Saves: a number, the name, and a pip that cycles ▲ advantage / ▼ disadvantage / none.
  function saves() {
    const ids = shown('saves');
    return section('saves', 'cs-pnl cs-saves', 'side', h('div', { class: 'cs-saverow', style: `--n:${Math.max(1, ids.length)}` }, ids.map((id) => {
      const sv = s.saves[id];
      const name = S.SAVES.find((x) => x.id === id).name;
      const label = sv.mode === 'adv' ? 'advantage' : sv.mode === 'dis' ? 'disadvantage' : 'normal';
      return removable('saves', id, h('div', { class: 'cs-save cs-rbox' },
        h('button', {
          type: 'button', class: 'cs-pip' + (sv.mode ? ' on' : ''), title: `Save: ${label}`, 'aria-label': `${name} save: ${label}`,
          onclick: () => { sv.mode = S.cycleSave(sv.mode); commit(); render(); },
        }, sv.mode === 'adv' ? '▲' : sv.mode === 'dis' ? '▼' : ''),
        calc(() => sv.val, (v) => { sv.val = v; }, `${name} save`, 'cs-num'),
        h('span', { class: 'cs-cap' }, name)));
    })));
  }

  // Combat: the Armor shield on the left; HP, Initiative / Speed and Wounds beside it.
  function combat() {
    const ids = shown('combat');
    const side = [];
    let ac = null;
    for (const id of ids) {
      if (id === 'armor') {
        const armor = text('armor', 'Armor', 'cs-num');
        stepper(armor, (v) => { armor.value = v; s.armor = v; commit(); });
        ac = removable('combat', id, h('div', { class: 'cs-ac' }, h('div', { class: 'cs-shield' }, shield(), armor), h('span', { class: 'cs-cap' }, 'Armor')));
      } else if (id === 'hp') side.push(removable('combat', id, hitPoints()));
      else if (id === 'initSpeed') {
        side.push(removable('combat', id, h('div', { class: 'cs-cell' },
          h('div', { class: 'cs-duo cs-rbox' },
            h('div', {}, follows(() => S.initiative(s), (v) => { s.initBonus = S.pointsFor(v, S.statVal(s, 'dex')); }, 'Initiative', 'cs-num',
              () => `DEX ${S.statVal(s, 'dex')} + ${s.initBonus || 0}`)),
            h('div', {}, text('speed', 'Speed', 'cs-num'))),
          h('div', { class: 'cs-labels' }, h('span', { class: 'cs-cap' }, 'Initiative'), h('span', { class: 'cs-cap' }, 'Speed')))));
      } else side.push(removable('combat', id, wounds()));
    }
    return section('combat', 'cs-pnl cs-combat', 'side', h('div', { class: 'cs-cmb' }, ac, side.length ? h('div', { class: 'cs-cmb-r' }, side) : null));
  }
  function hitPoints() {
    const cur = calc(() => s.hp.cur, (v) => { s.hp.cur = v; }, 'Hit points', 'cs-num', () => blood());
    const max = h('input', { class: 'cs-in cs-num', value: s.hp.max, 'aria-label': 'Max hit points', oninput: (ev) => { s.hp.max = ev.target.value; commit(); blood(); } });
    stepper(max, (v) => { max.value = v; s.hp.max = v; commit(); blood(); });
    const blood = () => cur.classList.toggle('bloodied', S.bloodied(s.hp));
    blood();
    return h('div', { class: 'cs-cell cs-hpcell' },
      h('div', { class: 'cs-duo cs-rbox' },
        h('div', {}, cur), h('div', {}, max),
        h('div', { class: 'cs-tmp' }, calc(() => s.hp.temp, (v) => { s.hp.temp = v; }, 'Temp HP', 'cs-num'))),
      h('div', { class: 'cs-labels' }, h('span', { class: 'cs-cap' }, 'HP'), h('span', { class: 'cs-cap' }, 'Max HP'), h('span', { class: 'cs-sub cs-tmp' }, 'Temp')));
  }
  function wounds() {
    const dots = [];
    for (let i = 0; i < s.woundsMax; i++) {
      const last = i === s.woundsMax - 1;
      const on = i < s.wounds;
      dots.push(h('button', {
        type: 'button', class: 'cs-w' + (on ? ' on' : '') + (last ? ' skull' : ''), 'aria-pressed': String(on),
        title: `${i + 1}`, 'aria-label': `Wound ${i + 1}`, onclick: () => { s.wounds = S.setWounds(s.wounds, i); commit(); render(); },
      }, last ? icon('skull', 'cs-ic') : h('span', { class: 'cs-dot' }), h('span', { class: 'cs-wn' }, String(i + 1))));
    }
    return h('div', { class: 'cs-wnd' },
      h('div', { class: 'cs-track cs-rbox' + (s.wounds >= s.woundsMax ? ' dead' : '') }, dots),
      h('span', { class: 'cs-cap' }, 'Wounds'));
  }

  function skills() {
    return section('skills', 'cs-pnl cs-skills', 'top', h('div', { class: 'cs-band', style: `--n:${Math.max(1, shown('skills').length)}` }, shown('skills').map((id) => {
      const sk = S.SKILLS.find((x) => x.id === id);
      const st = statName(sk.stat);
      const pts = h('span', { class: 'cs-pts' });
      const showPts = () => { const p = s.skills[id]; pts.textContent = p ? (p > 0 ? `+${p}` : String(p)) : ''; };
      derived.push(showPts);
      return removable('skills', id, h('div', { class: 'cs-skill' },
        h('div', { class: 'cs-kbox cs-rbox' }, pts,
          follows(() => S.skillTotal(s, id), (v) => { s.skills[id] = S.pointsFor(v, S.statVal(s, sk.stat)); }, sk.name, 'cs-num',
            () => `${st} ${S.statVal(s, sk.stat)} + ${s.skills[id] || 0}`)),
        h('span', { class: 'cs-cap' }, sk.name),
        h('span', { class: 'cs-sub' }, st)));
    })));
  }

  // Tabs of collapsible entries (Actions, Abilities, Inventory…). Edit layout renames, adds,
  // deletes and reorders tabs.
  function tabsSection() {
    if (!s.tabs.length && !editing) return null;
    const cur = s.tabs.find((t) => t.id === s.tab) || s.tabs[0];
    const strip = s.tabs.map((t, i) => {
      const on = t === cur;
      if (!editing) {
        return h('button', { type: 'button', role: 'tab', class: 'cs-tab' + (on ? ' on' : ''), 'aria-selected': String(on),
          onclick: () => { s.tab = t.id; commit(); render(); } }, t.name || 'Untitled', h('span', { class: 'cs-tabn' }, String(t.entries.length)));
      }
      const grip = h('span', { class: 'cs-tgrip', title: 'Drag to move', draggable: 'true' }, icon('grip', 'cs-ic sm'));
      const node = h('div', { class: 'cs-tab edit' + (on ? ' on' : ''), onclick: (ev) => { if (!on && !ev.target.closest('button')) { s.tab = t.id; commit(); render(); } } },
        grip,
        h('input', { class: 'cs-tname', value: t.name, 'aria-label': 'Tab name', placeholder: 'Tab', spellcheck: false, size: Math.max(4, t.name.length),
          oninput: (ev) => { t.name = ev.target.value; ev.target.size = Math.max(4, t.name.length); commit(); },
          onkeydown: (ev) => { if (ev.key === 'Enter') ev.target.blur(); } }),
        h('button', { type: 'button', class: 'cs-tdel', title: 'Delete tab', 'aria-label': `Delete ${t.name || 'tab'} tab`,
          onclick: () => change(`Deleted ${t.name || 'tab'}`, () => {
            const k = s.tabs.indexOf(t);
            s.tabs = s.tabs.filter((x) => x !== t);
            if (s.tab === t.id) s.tab = (s.tabs[Math.min(k, s.tabs.length - 1)] || {}).id || '';
          }) }, icon('close', 'cs-ic xs')));
      draggable(grip, node, 'tab', i, (from, to) => change(null, () => { s.tabs = S.move(s.tabs, from, to); }));
      return node;
    });
    if (editing) {
      strip.push(h('button', { type: 'button', class: 'cs-tabadd', title: 'Add tab', 'aria-label': 'Add tab',
        onclick: () => {
          const t = S.newTab('');
          change(null, () => { s.tabs.push(t); s.tab = t.id; });
          setTimeout(() => { const n = document.querySelector('.cs-tab.on .cs-tname'); if (n) n.focus(); }, 0);
        } }, '+'));
    }
    let panel = null;
    if (cur) {
      const el = entryList({ key: 'tab-' + cur.id, get: () => cur.entries, set: (v) => { cur.entries = v; }, sum: true, cls: 'lite' });
      panel = h('div', { class: 'cs-tabpanel', role: 'tabpanel' }, el.fold ? h('div', { class: 'cs-elist-top' }, el.fold) : null, el.list, el.add);
    }
    return h('section', { class: 'cs-tabs' }, h('div', { class: 'cs-tabstrip', role: 'tablist' }, strip), panel);
  }

  // A list of collapsible entries (a tab's, or the notes'): click a bar to open it, drag to reorder.
  function entryList(list) {
    const items = list.get();
    const add = h('button', {
      type: 'button', class: 'cs-addb wide',
      onclick: () => {
        const e = S.newEntry();
        openEntries.add(e.id);
        change(null, () => { list.set(list.get().concat(e)); });
        setTimeout(() => { const n = document.querySelector(`[data-entry="${e.id}"] .cs-etitle`); if (n) n.focus(); }, 0);
      },
    }, '+ Entry');
    const many = items.length > 1;
    const allOpen = many && items.every((e) => openEntries.has(e.id));
    const fold = many ? h('button', {
      type: 'button', class: 'cs-fold', onclick: () => {
        if (allOpen) items.forEach((e) => openEntries.delete(e.id)); else items.forEach((e) => openEntries.add(e.id));
        render();
      },
    }, allOpen ? 'Collapse all' : 'Expand all') : null;
    return { fold, list: h('div', { class: 'cs-elist' }, items.map((e, i) => entry(e, i, list))), add };
  }
  function grow(t) { t.style.height = 'auto'; t.style.height = Math.max(96, t.scrollHeight + 2) + 'px'; }
  function entry(e, i, list) {
    const open = openEntries.has(e.id);
    const toggle = () => { if (open) openEntries.delete(e.id); else openEntries.add(e.id); render(); };
    const first = e.body.split('\n').find((l) => l.trim()) || '';
    const peek = (list.sum && e.sum) || first;
    const title = open
      ? h('input', { class: 'cs-etitle', value: e.title, 'aria-label': 'Title', placeholder: 'Title', spellcheck: false,
        oninput: (ev) => { e.title = ev.target.value; commit(); }, onkeydown: (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); const b = node.querySelector('.cs-esum, .cs-ebody'); if (b) b.focus(); } } })
      : h('span', { class: 'cs-etext' },
        h('span', { class: 'cs-etitle' + (e.title ? '' : ' none') }, e.title || 'Untitled'),
        peek ? h('span', { class: 'cs-epeek' }, peek) : null);
    const del = h('button', {
      type: 'button', class: 'cs-edel', title: 'Delete', 'aria-label': `Delete ${e.title || 'entry'}`,
      onclick: () => change(`Deleted ${e.title || 'entry'}`, () => { list.set(list.get().filter((x) => x.id !== e.id)); openEntries.delete(e.id); }),
    }, icon('close', 'cs-ic sm'));
    const grip = h('span', { class: 'cs-grip', title: 'Drag to move', draggable: 'true' }, icon('grip', 'cs-ic sm'));
    const bar = h('div', {
      class: 'cs-ebar', role: 'button', tabIndex: 0, 'aria-expanded': String(open),
      onclick: (ev) => { if (!ev.target.closest('input, button, .cs-grip')) toggle(); },
      onkeydown: (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === bar) { ev.preventDefault(); toggle(); } },
    }, grip, icon('chevron', 'cs-ic cs-chev'), title, del);
    const node = h('div', { class: `cs-entry ${list.cls || ''}${open ? ' open' : ''}`, 'data-entry': e.id }, bar);
    if (open) {
      if (list.sum) {
        node.append(h('input', { class: 'cs-esum', value: e.sum, 'aria-label': 'Summary', placeholder: 'Summary', spellcheck: false,
          oninput: (ev) => { e.sum = ev.target.value; commit(); }, onkeydown: (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); node.querySelector('.cs-ebody').focus(); } } }));
      }
      const body = h('textarea', { class: 'cs-ebody', 'aria-label': e.title || 'Entry', value: e.body, oninput: (ev) => { e.body = ev.target.value; commit(); grow(ev.target); } });
      node.append(body);
      setTimeout(() => grow(body), 0);
    }
    draggable(grip, node, 'entry-' + list.key, i, (from, to) => change(null, () => { list.set(S.move(list.get(), from, to)); }));
    return node;
  }

  // Notes: free text on the left, collapsible entries on the right.
  function notes() {
    const free = h('textarea', { class: 'cs-free', 'aria-label': 'Notes', value: s.notes, oninput: (ev) => { s.notes = ev.target.value; commit(); } });
    const el = entryList({ key: 'notes', get: () => s.entries, set: (v) => { s.entries = v; } });
    return h('div', { class: 'cs-notes' },
      h('div', { class: 'cs-panel' }, h('div', { class: 'cs-ptitle' }, h('span', {}, 'Notes')), free),
      h('div', { class: 'cs-panel cs-entries' }, h('div', { class: 'cs-ptitle' }, h('span', {}, 'Entries'), el.fold), el.list, el.add));
  }

  function render() {
    derived = [];
    const sheet = $('sheet');
    sheet.classList.toggle('editing', editing);
    sheet.replaceChildren(
      header(),
      h('div', { class: 'cs-row' }, h('div', { class: 'cs-col' }, stats(), saves()), combat()),
      skills(),
      tabsSection() || '',
      notes());
    refresh();
  }

  // An open + closes when you click elsewhere or press Esc.
  document.addEventListener('pointerdown', (ev) => {
    if (tray && !ev.target.closest('.cs-sec.tray-open, .cs-more, #toast')) { tray = null; render(); }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    if (tray) { tray = null; render(); } else if (editing && !typing()) setEditing(false);
  });

  // --- Toolbar ------------------------------------------------------------------------
  function setEditing(on) {
    editing = on;
    const b = $('edit');
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? 'Done' : 'Edit layout';
    render();
  }
  $('edit').addEventListener('click', () => setEditing(!editing));

  function names() {
    const sel = $('who');
    sel.replaceChildren(...Object.values(all.chars).map((c) => h('option', { value: c.id, selected: c.id === s.id }, c.name || 'Unnamed')));
  }
  function show(c) {
    all.chars[c.id] = c;
    s = c;
    tray = null;
    history = [];
    hideToast();
    openEntries.clear();
    commit();
    names();
    render();
  }
  const menu = $('menu');
  const closeMenu = () => { menu.open = false; };
  document.addEventListener('pointerdown', (ev) => { if (menu.open && !ev.target.closest('#menu')) closeMenu(); });
  $('who').addEventListener('change', (ev) => show(all.chars[ev.target.value]));
  $('new').addEventListener('click', () => { show(S.blank()); const n = document.querySelector('.cs-name'); if (n) n.focus(); });
  $('copy').addEventListener('click', () => {
    closeMenu();
    const c = S.normalize(JSON.parse(JSON.stringify(s)));
    c.id = S.uid();
    c.name = (s.name || 'Unnamed') + ' (copy)';
    show(c);
  });
  $('delete').addEventListener('click', () => {
    closeMenu();
    if (!confirm(`Delete ${s.name || 'this character'}? This can't be undone.`)) return;
    delete all.chars[s.id];
    show(Object.values(all.chars)[0] || S.blank());
  });
  $('export').addEventListener('click', () => {
    closeMenu();
    const blob = new Blob([S.exportJson(s)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `${(s.name || 'character').replace(/[^\w\- ]+/g, '').trim() || 'character'}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('import').addEventListener('click', () => { closeMenu(); $('import-file').click(); });
  $('import-file').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    try { show(S.importJson(await file.text())); }
    catch (err) { alert(`Couldn't import ${file.name}: ${err.message}`); }
  });
  $('print').addEventListener('click', () => { closeMenu(); tray = null; if (editing) setEditing(false); else render(); window.print(); });

  names();
  render();
  commit();
})();
