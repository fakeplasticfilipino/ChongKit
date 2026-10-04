// Character Sheet: the page. Draws the sheet from the character (sheet.js has the rules) and
// saves every change to this browser's localStorage.
// Two modes: playing (fill it in, use the tabs) and Edit layout (add another box of a section's
// kind, remove, restore and reorder boxes). Every removal can be undone (toast or Ctrl+Z).
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

  // --- Sections and edit layout -----------------------------------------------------------
  const TITLES = { header: 'Details', stats: 'Stats', saves: 'Saves', combat: 'Combat', skills: 'Skills' };
  const DEFAULT_NAMES = {
    header: { name: 'Character Name', cls: 'Class & Level', ancestry: 'Ancestry', height: 'Height', weight: 'Weight', hitDice: 'Hit Dice' },
    stats: Object.fromEntries(S.STATS.map((x) => [x.id, x.name])),
    saves: Object.fromEntries(S.SAVES.map((x) => [x.id, `${x.name} save`])),
    combat: { armor: 'Armor', hp: 'Hit Points', initSpeed: 'Initiative & Speed', wounds: 'Wounds' },
    skills: Object.fromEntries(S.SKILLS.map((x) => [x.id, x.name])),
  };
  const ADD_NAMES = { text: 'Line', stat: 'Stat', save: 'Save', skill: 'Skill', num: 'Number', pair: 'Current / Max' };
  const shown = (name) => S.SECTIONS[name].filter((id) => !S.isRemoved(s, name, id));
  const removedIn = (name) => S.SECTIONS[name].filter((id) => S.isRemoved(s, name, id));

  // A section: a framed panel with its side label (or a label on the top edge). In Edit layout it
  // ends with a bar that adds another box of the same kind and puts removed boxes back.
  function section(name, cls, label, ...content) {
    const lab = label === 'side' ? h('div', { class: 'cs-vl' }, h('span', {}, TITLES[name]))
      : label === 'top' ? h('span', { class: 'cs-legend' }, TITLES[name]) : null;
    return h('section', { class: `cs-sec ${cls}` }, lab, ...content, editing ? editBar(name) : null);
  }
  function editBar(name) {
    const adds = S.ADDS[name].map((type) => h('button', {
      type: 'button', class: 'cs-addb',
      onclick: () => {
        const b = S.newBox(name, type);
        change(null, () => { s.extras[name].push(b); });
        setTimeout(() => { const n = document.querySelector(`[data-box="${b.id}"] .cs-lbl-in`); if (n) n.focus(); }, 0);
      },
    }, '+ ', ADD_NAMES[type]));
    const gone = removedIn(name).map((id) => h('button', {
      type: 'button', class: 'cs-addb restore', title: 'Put back',
      onclick: () => change(null, () => { s = S.setRemoved(s, name, id, false); }),
    }, icon('undo', 'cs-ic sm'), DEFAULT_NAMES[name][id]));
    return h('div', { class: 'cs-editbar' }, adds, name === 'combat' ? woundsSetting() : null, gone);
  }
  // In Edit layout every default box gets a × that takes it off the sheet (Edit layout can put it back).
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
  // Drag to reorder: the grip starts it, items in the same list accept the drop.
  let dragKind = null;
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

  // --- Added boxes: drawn like the section's own boxes ---------------------------------------
  // Their name is typed in Edit layout and shown as a label when playing.
  function label(b, fallback, cls) {
    if (!editing) return h('span', { class: cls }, b.label || fallback);
    return h('input', { class: `${cls} cs-lbl-in`, value: b.label, placeholder: fallback, 'aria-label': 'Name', spellcheck: false,
      size: Math.max(3, (b.label || fallback).length),
      oninput: (ev) => { b.label = ev.target.value; ev.target.size = Math.max(3, (b.label || fallback).length); commit(); },
      onkeydown: (ev) => { if (ev.key === 'Enter') ev.target.blur(); } });
  }
  function added(name, b, i) {
    const nm = b.label || ADD_NAMES[b.type];
    let node;
    if (b.type === 'stat') {
      const name2 = editing ? label(b, 'Stat', 'cs-sname') : h('button', {
        type: 'button', class: 'cs-sname' + (b.key ? ' on' : ''), 'aria-pressed': String(b.key), title: 'Key stat', 'aria-label': `${nm} key stat`,
        onclick: () => { b.key = !b.key; commit(); render(); },
      }, b.label || 'Stat');
      node = h('div', { class: 'cs-stat' },
        h('div', { class: 'cs-sbox cs-rbox' },
          whole(() => b.value, (v) => { b.value = v; refresh(); }, nm, 'cs-num'),
          calc(() => b.slot, (v) => { b.slot = v; }, `${nm} small number`, 'cs-oval')),
        name2);
    } else if (b.type === 'save') {
      node = h('div', { class: 'cs-save cs-rbox' },
        pip(b, nm), calc(() => b.value, (v) => { b.value = v; }, `${nm} save`, 'cs-num'), label(b, 'Save', 'cs-cap'));
    } else if (b.type === 'skill') {
      const pts = h('span', { class: 'cs-pts' });
      derived.push(() => { const p = b.points || 0; pts.textContent = p ? (p > 0 ? `+${p}` : String(p)) : ''; });
      const stat = h('select', { class: 'cs-xstat', 'aria-label': `${nm} stat`, onchange: (ev) => { b.stat = ev.target.value; commit(); refresh(); } },
        S.statList(s).map((x) => h('option', { value: x.id, selected: x.id === b.stat }, x.name)));
      node = h('div', { class: 'cs-skill' },
        h('div', { class: 'cs-kbox cs-rbox' }, pts,
          follows(() => S.boxSkillTotal(s, b), (v) => { b.points = S.pointsFor(v, S.statVal(s, b.stat)); }, nm, 'cs-num',
            () => `${S.statList(s).find((x) => x.id === b.stat).name} ${S.statVal(s, b.stat)} + ${b.points || 0}`)),
        label(b, 'Skill', 'cs-cap'), stat);
    } else if (b.type === 'text') {
      const inp = h('input', { class: 'cs-in cs-line', value: b.value, 'aria-label': nm, spellcheck: false, oninput: (ev) => { b.value = ev.target.value; commit(); } });
      node = h('label', { class: 'cs-lf' }, label(b, 'Line', 'cs-sub'), inp);
    } else if (b.type === 'pair') {
      const max = h('input', { class: 'cs-in cs-num', value: b.max, 'aria-label': `${nm} max`, oninput: (ev) => { b.max = ev.target.value; commit(); } });
      stepper(max, (v) => { max.value = v; b.max = v; commit(); });
      node = h('div', { class: 'cs-cell' },
        h('div', { class: 'cs-duo cs-rbox' }, h('div', {}, calc(() => b.value, (v) => { b.value = v; }, nm, 'cs-num')), h('div', {}, max)),
        h('div', { class: 'cs-labels' }, label(b, 'Current', 'cs-cap'), h('span', { class: 'cs-cap' }, 'Max')));
    } else {
      node = h('div', { class: 'cs-cell cs-single' },
        h('div', { class: 'cs-one cs-rbox' }, calc(() => b.value, (v) => { b.value = v; }, nm, 'cs-num')),
        label(b, 'Number', 'cs-cap'));
    }
    node.classList.add('cs-box', 'cs-added');
    node.dataset.box = b.id;
    if (editing) {
      node.append(h('button', {
        type: 'button', class: 'cs-x', title: 'Delete', 'aria-label': `Delete ${nm}`,
        onclick: () => change(`Deleted ${nm}`, () => { s.extras[name] = s.extras[name].filter((x) => x.id !== b.id); }),
      }, icon('close', 'cs-ic xs')));
      const grip = h('span', { class: 'cs-grip', title: 'Drag to move', draggable: 'true' }, icon('grip', 'cs-ic sm'));
      node.append(grip);
      draggable(grip, node, 'box-' + name, i, (from, to) => change(null, () => { s.extras[name] = S.move(s.extras[name], from, to); }));
    }
    return node;
  }
  const addedIn = (name) => s.extras[name].map((b, i) => added(name, b, i));
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
      h('label', { class: 'cs-lf' }, h('span', { class: 'cs-sub' }, DEFAULT_NAMES.header[id]), text(id, DEFAULT_NAMES.header[id], 'cs-line'))))
      .concat(addedIn('header'));
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
    return section('stats', 'cs-pnl cs-stats', 'side', h('div', { class: 'cs-statrow' }, shown('stats').map((id) => {
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
    }), addedIn('stats')));
  }

  // Saves: a number, the name, and a pip that cycles ▲ advantage / ▼ disadvantage / none.
  function pip(sv, name) {
    const lab = sv.mode === 'adv' ? 'advantage' : sv.mode === 'dis' ? 'disadvantage' : 'normal';
    return h('button', {
      type: 'button', class: 'cs-pip' + (sv.mode ? ' on' : ''), title: `Save: ${lab}`, 'aria-label': `${name} save: ${lab}`,
      onclick: () => { sv.mode = S.cycleSave(sv.mode); commit(); render(); },
    }, sv.mode === 'adv' ? '▲' : sv.mode === 'dis' ? '▼' : '');
  }
  function saves() {
    return section('saves', 'cs-pnl cs-saves', 'side', h('div', { class: 'cs-saverow' }, shown('saves').map((id) => {
      const sv = s.saves[id];
      const name = S.SAVES.find((x) => x.id === id).name;
      return removable('saves', id, h('div', { class: 'cs-save cs-rbox' },
        pip(sv, name),
        calc(() => sv.val, (v) => { sv.val = v; }, `${name} save`, 'cs-num'),
        h('span', { class: 'cs-cap' }, name)));
    }), addedIn('saves')));
  }

  // Combat: the Armor shield on the left; HP, Initiative / Speed, Wounds and added boxes beside it.
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
    side.push(...addedIn('combat'));
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
  // Wounds: the track ends in the skull. Under it, an optional row of five small dashed circles
  // for extra wounds (added and removed in Edit layout).
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
    let extra = null;
    if (s.woundExtra) {
      extra = h('div', { class: 'cs-wx' }, s.woundMarks.map((m, i) => h('button', {
        type: 'button', class: 'cs-wxd' + (m ? ' on' : ''), 'aria-pressed': String(m), 'aria-label': `Extra wound ${i + 1}`,
        onclick: () => { s.woundMarks[i] = !m; commit(); render(); },
      })), editing ? h('button', {
        type: 'button', class: 'cs-wxdel', title: 'Remove extra circles', 'aria-label': 'Remove extra wound circles',
        onclick: () => change('Removed extra wounds', () => { s.woundExtra = false; }),
      }, icon('close', 'cs-ic xs')) : null);
    } else if (editing) {
      extra = h('div', { class: 'cs-wx' }, h('button', {
        type: 'button', class: 'cs-addb sm', onclick: () => change(null, () => { s.woundExtra = true; }),
      }, `+ ${S.EXTRA_WOUNDS} extra`));
    }
    return h('div', { class: 'cs-wnd' },
      h('div', { class: 'cs-track cs-rbox' }, dots),
      h('span', { class: 'cs-cap' }, 'Wounds'),
      extra);
  }

  function skills() {
    return section('skills', 'cs-pnl cs-skills', 'top', h('div', { class: 'cs-band' }, shown('skills').map((id) => {
      const sk = S.SKILLS.find((x) => x.id === id);
      const st = statName(sk.stat);
      const pts = h('span', { class: 'cs-pts' });
      derived.push(() => { const p = s.skills[id]; pts.textContent = p ? (p > 0 ? `+${p}` : String(p)) : ''; });
      return removable('skills', id, h('div', { class: 'cs-skill' },
        h('div', { class: 'cs-kbox cs-rbox' }, pts,
          follows(() => S.skillTotal(s, id), (v) => { s.skills[id] = S.pointsFor(v, S.statVal(s, sk.stat)); }, sk.name, 'cs-num',
            () => `${st} ${S.statVal(s, sk.stat)} + ${s.skills[id] || 0}`)),
        h('span', { class: 'cs-cap' }, sk.name),
        h('span', { class: 'cs-sub' }, st)));
    }), addedIn('skills')));
  }

  // Tabs, like a browser's: click to switch, + adds one, double-click a name to rename it,
  // × closes it (with Undo), drag a tab to move it.
  let renaming = null;
  function tabsSection() {
    const cur = s.tabs.find((t) => t.id === s.tab) || s.tabs[0];
    const pickTab = (t) => { if (s.tab !== t.id) { s.tab = t.id; commit(); render(); } };
    const strip = s.tabs.map((t, i) => {
      const on = t === cur;
      let name;
      if (renaming === t.id) {
        let done = false;
        const finish = (keep) => {
          if (done) return;
          done = true;
          if (keep) { t.name = name.value.trim(); commit(); }
          renaming = null;
          render();
        };
        name = h('input', { class: 'cs-tname', value: t.name, 'aria-label': 'Tab name', spellcheck: false, size: Math.max(4, t.name.length + 1),
          oninput: () => { name.size = Math.max(4, name.value.length + 1); },
          onkeydown: (ev) => { if (ev.key === 'Enter') finish(true); if (ev.key === 'Escape') { ev.stopPropagation(); finish(false); } },
          onblur: () => finish(true) });
      } else {
        name = h('button', { type: 'button', role: 'tab', class: 'cs-tabbtn', 'aria-selected': String(on), title: 'Double-click to rename',
          onclick: () => pickTab(t), ondblclick: () => { renaming = t.id; s.tab = t.id; render(); } },
        t.name || 'Untitled', h('span', { class: 'cs-tabn' }, String(t.entries.length)));
      }
      const node = h('div', { class: 'cs-tab' + (on ? ' on' : ''), draggable: renaming === t.id ? 'false' : 'true' }, name,
        h('button', { type: 'button', class: 'cs-tdel', title: 'Close tab', 'aria-label': `Close ${t.name || 'tab'}`,
          onclick: () => change(`Closed ${t.name || 'tab'}`, () => {
            const k = s.tabs.indexOf(t);
            s.tabs = s.tabs.filter((x) => x !== t);
            if (s.tab === t.id) s.tab = (s.tabs[Math.min(k, s.tabs.length - 1)] || {}).id || '';
          }) }, icon('close', 'cs-ic xs')));
      draggable(node, node, 'tab', i, (from, to) => change(null, () => { s.tabs = S.move(s.tabs, from, to); }));
      return node;
    });
    strip.push(h('button', { type: 'button', class: 'cs-tabadd', title: 'New tab', 'aria-label': 'New tab',
      onclick: () => {
        const t = S.newTab('');
        change(null, () => { s.tabs.push(t); s.tab = t.id; });
        renaming = t.id;
        render();
      } }, '+'));
    let panel = null;
    if (cur) {
      const el = entryList({ key: 'tab-' + cur.id, get: () => cur.entries, set: (v) => { cur.entries = v; } });
      panel = h('div', { class: 'cs-tabpanel', role: 'tabpanel' }, el.fold ? h('div', { class: 'cs-elist-top' }, el.fold) : null, el.list, el.add);
    }
    if (renaming) setTimeout(() => { const n = document.querySelector('.cs-tname'); if (n && document.activeElement !== n) { n.focus(); n.select(); } }, 0);
    return h('section', { class: 'cs-tabs' }, h('div', { class: 'cs-tabstrip', role: 'tablist' }, strip), panel);
  }

  // A tab's entries: bars showing a name and summary; click one to open it, drag to reorder.
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
    const peek = e.sum || e.body.split('\n').find((l) => l.trim()) || '';
    const title = open
      ? h('input', { class: 'cs-etitle', value: e.title, 'aria-label': 'Title', placeholder: 'Title', spellcheck: false,
        oninput: (ev) => { e.title = ev.target.value; commit(); }, onkeydown: (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); const b = node.querySelector('.cs-esum'); if (b) b.focus(); } } })
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
    const node = h('div', { class: `cs-entry lite${open ? ' open' : ''}`, 'data-entry': e.id }, bar);
    if (open) {
      node.append(h('input', { class: 'cs-esum', value: e.sum, 'aria-label': 'Summary', placeholder: 'Summary', spellcheck: false,
        oninput: (ev) => { e.sum = ev.target.value; commit(); }, onkeydown: (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); node.querySelector('.cs-ebody').focus(); } } }));
      const body = h('textarea', { class: 'cs-ebody', 'aria-label': e.title || 'Entry', value: e.body, oninput: (ev) => { e.body = ev.target.value; commit(); grow(ev.target); } });
      node.append(body);
      setTimeout(() => grow(body), 0);
    }
    draggable(grip, node, 'entry-' + list.key, i, (from, to) => change(null, () => { list.set(S.move(list.get(), from, to)); }));
    return node;
  }

  // Notes: one free-text panel across the sheet.
  function notes() {
    return h('section', { class: 'cs-sec cs-pnl cs-notes' }, h('span', { class: 'cs-legend' }, 'Notes'),
      h('textarea', { class: 'cs-free', 'aria-label': 'Notes', value: s.notes, oninput: (ev) => { s.notes = ev.target.value; commit(); } }));
  }

  function render() {
    derived = [];
    const sheet = $('sheet');
    sheet.classList.toggle('editing', editing);
    sheet.replaceChildren(
      header(),
      h('div', { class: 'cs-row' }, h('div', { class: 'cs-col' }, stats(), saves()), combat()),
      skills(),
      tabsSection(),
      notes());
    refresh();
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && editing && !typing()) setEditing(false);
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
    renaming = null;
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
  $('print').addEventListener('click', () => { closeMenu(); if (editing) setEditing(false); else render(); window.print(); });

  names();
  render();
  commit();
})();
