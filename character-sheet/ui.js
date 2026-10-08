// Character Sheet: the page. Draws the sheet from the character (sheet.js has the rules, notes.js
// draws the notes) and saves every change to this browser's localStorage.
// Two modes: playing (fill it in) and Edit layout (every box gets a × and a grip, labels become
// fields, each list ends with a + button). Every removal can be undone (toast or Ctrl+Z).
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
  let printing = false; // drawing for Print: every note open, as plain text

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
    kids.flat(Infinity).forEach((c) => c != null && c !== false && n.append(c));
    return n;
  }
  const ICON = {
    skull: 'M12 2C6.5 2 3 5.6 3 10.2c0 2.6 1.2 4.7 3 6V19a1 1 0 001 1h2v-2h2v2h2v-2h2v2h2a1 1 0 001-1v-2.8c1.8-1.3 3-3.4 3-6C21 5.6 17.5 2 12 2zM8.5 14a2 2 0 110-4 2 2 0 010 4zm7 0a2 2 0 110-4 2 2 0 010 4z',
    chevron: 'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z',
    close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    grip: 'M9 4a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM9 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zM9 16a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z',
    heart: 'M12 21s-7.5-4.6-9.8-9.3C.6 8.3 2.7 4.5 6.4 4.5c2.3 0 4 1.3 5.6 3.3 1.6-2 3.3-3.3 5.6-3.3 3.7 0 5.8 3.8 4.2 7.2C19.5 16.4 12 21 12 21z',
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
    // Another tab of this page may have saved since: take its newer characters first.
    adopt(store.getItem(S.STORE));
    // A character whose content changed gets a new timestamp (and is queued for the account).
    for (const c of Object.values(all.chars)) {
      const now = S.content(c);
      if (lastJson[c.id] !== now) { c.updated = Date.now(); lastJson[c.id] = now; dirty.add(c.id); }
    }
    const ok = S.saveAll(store, all);
    stored = new Set(Object.keys(all.chars));
    // Saved here, but say so if the account is behind (a sync failed and is waiting to retry).
    status(!ok ? 'Not saved' : syncBad ? 'Saved here, not synced' : 'Saved', !ok || syncBad);
    if (C && C.signedIn && dirty.size) schedulePush(1200);
  }
  function status(text, bad) {
    const n = $('saved');
    n.textContent = text;
    n.classList.toggle('bad', !!bad);
    n.classList.add('show');
    clearTimeout(savedTimer);
    if (!bad) savedTimer = setTimeout(() => n.classList.remove('show'), 1400);
  }
  window.addEventListener('pagehide', () => { save(); push(); });

  // --- Several tabs of this page ----------------------------------------------------------
  // Every tab saves to the same localStorage key. When another tab saves, take its newer
  // characters (never the one you're typing in) and its deletions (only of characters left
  // untouched here), so tabs don't overwrite each other.
  let stored = new Set(Object.keys(all.chars)); // ids in localStorage when this tab last read or wrote it
  const deletedHere = new Set();
  function adopt(raw) {
    let data;
    try { data = JSON.parse(raw); } catch { return false; }
    if (!data || !data.chars || typeof data.chars !== 'object') return false;
    let changed = false;
    const other = {};
    for (const r of Object.values(data.chars)) { const c = S.normalize(r); other[c.id] = c; }
    for (const o of Object.values(other)) {
      const mine = all.chars[o.id];
      if (!mine) {
        if (deletedHere.has(o.id)) continue; // deleted in this tab
        all.chars[o.id] = o; lastJson[o.id] = S.content(o); changed = true;
      } else if (o.updated > mine.updated && S.content(o) !== S.content(mine)) {
        if (mine === s && typing()) continue;
        all.chars[o.id] = o; lastJson[o.id] = S.content(o);
        if (mine === s) s = o;
        changed = true;
      }
    }
    for (const id of Object.keys(all.chars)) {
      if (!other[id] && stored.has(id) && lastJson[id] === S.content(all.chars[id]) && Object.keys(all.chars).length > 1) {
        delete all.chars[id]; changed = true;
      }
    }
    stored = new Set(Object.keys(other));
    if (!all.chars[s.id]) { s = all.chars[Object.keys(all.chars)[0]]; all.current = s.id; }
    return changed;
  }
  window.addEventListener('storage', (ev) => {
    if (ev.key !== S.STORE || ev.newValue == null) return;
    if (adopt(ev.newValue)) softRender();
  });
  // Redraw after outside changes (other tabs, the account), but never under the cursor: while
  // you're typing it waits until you leave the box.
  let pendingRender = false;
  function softRender() {
    if (typing()) { pendingRender = true; return; }
    pendingRender = false;
    names();
    render();
  }
  document.addEventListener('focusout', () => setTimeout(() => { if (pendingRender && !typing()) softRender(); }, 0));

  // --- Account sync (cloud.js) -----------------------------------------------------------
  // Signed in, every edited character is also saved to the account; signing in merges the
  // account's characters with this browser's (the newer edit of each wins). Characters synced to
  // one account are never uploaded to another.
  const C = window.Cloud;
  const lastJson = {}; // content last saved, per character
  const dirty = new Set(); // characters edited since they were last sent to the account
  let pushTimer = null;
  let retryDelay = 5000; // after a failed sync: try again in 5 s, then 10, 20… up to a minute
  let syncBad = false;
  for (const c of Object.values(all.chars)) lastJson[c.id] = S.content(c);
  function schedulePush(ms) { clearTimeout(pushTimer); pushTimer = setTimeout(push, ms); }
  function failed() {
    syncBad = true;
    status('Not synced', true);
    schedulePush(retryDelay);
    retryDelay = Math.min(60000, retryDelay * 2);
  }
  async function push() {
    clearTimeout(pushTimer);
    if (!C || !C.signedIn) return;
    try {
      await C.flushDeletes();
      if (!dirty.size) return;
      const ids = [...dirty];
      dirty.clear();
      // Another account's characters (left in this browser) are never uploaded here.
      const list = ids.map((id) => all.chars[id]).filter((c) => c && (!c.owner || c.owner === C.userId));
      if (!list.length) return; // only other accounts' characters changed: nothing for this one
      list.forEach((c) => { c.owner = C.userId; });
      try {
        await C.push(list);
      } catch (e) {
        ids.forEach((id) => dirty.add(id));
        throw e;
      }
      C.setSynced([...C.synced(), ...list.map((c) => c.id)]);
      S.saveAll(store, all);
      retryDelay = 5000;
      syncBad = false;
      status('Synced');
    } catch {
      if (C.signedIn) failed();
    }
  }
  async function syncAll() {
    if (!C || !C.signedIn) return;
    save();
    status('Syncing…');
    try {
      await C.flushDeletes();
      const remote = await C.list();
      const before = JSON.stringify(Object.values(all.chars).map(S.content).sort());
      const m = S.mergeChars(all.chars, remote, C.synced(), C.userId, C.pendingDeletes());
      if (!Object.keys(m.chars).length) { const b = S.blank(); m.chars[b.id] = b; }
      all.chars = m.chars;
      for (const c of Object.values(all.chars)) lastJson[c.id] = S.content(c);
      m.upload.forEach((id) => dirty.add(id));
      C.setSynced(remote.map((r) => r.id));
      if (!all.chars[all.current]) all.current = Object.keys(all.chars)[0];
      if (all.chars[s.id] !== s) {
        const was = s.id;
        s = all.chars[all.current];
        if (s.id !== was) history = [];
      }
      S.saveAll(store, all);
      stored = new Set(Object.keys(all.chars));
      // Only redraw when the account actually changed something.
      if (JSON.stringify(Object.values(all.chars).map(S.content).sort()) !== before) softRender();
      else names();
      retryDelay = 5000;
      syncBad = false;
      if (dirty.size) await push(); else status('Synced');
    } catch {
      if (C.signedIn) failed();
    }
  }
  // Coming back to the tab picks up edits made on another device.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncAll(); });
  window.addEventListener('online', () => { if (C && C.signedIn) syncAll(); });

  // --- Undo -------------------------------------------------------------------------
  // Structural changes (remove, delete, add, move, Reset) go through change(): one snapshot each.
  // A layout snapshot brings back the earlier layout and keeps typing done since; a full one
  // (Reset) brings back everything.
  let history = [];
  let toastTimer = null;
  function change(label, fn, full = false) {
    history.push({ json: JSON.stringify(s), full });
    if (history.length > 60) history.shift();
    fn();
    commit();
    render();
    if (label) toast(label);
  }
  function undo() {
    const prev = history.pop();
    if (!prev) return;
    const was = JSON.parse(prev.json);
    s = S.normalize(prev.full ? was : S.undoLayout(was, s));
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
  // Every box holds the text typed into it. ↑ / ↓ step a whole number by 1 (Shift: 5).
  function stepper(inp, onStep) {
    inp.addEventListener('keydown', (ev) => {
      if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
      const v = S.step(inp.value, (ev.key === 'ArrowUp' ? 1 : -1) * (ev.shiftKey ? 5 : 1));
      if (v === inp.value) return;
      ev.preventDefault();
      inp.value = v;
      onStep(v);
    });
  }
  function field(obj, key, label, cls = '', opts = {}) {
    const inp = h('input', { class: 'cs-in ' + cls, value: obj[key], 'aria-label': label, spellcheck: false, inputMode: 'text',
      onkeydown: (ev) => { if (ev.key === 'Enter') inp.blur(); } });
    inp.addEventListener('input', () => { obj[key] = inp.value; commit(); if (opts.after) opts.after(); });
    if (opts.step) stepper(inp, (v) => { obj[key] = v; commit(); });
    return inp;
  }
  // A box's name: plain text when playing, typed in Edit layout.
  function label(obj, key, fallback, cls) {
    if (!editing) return h('span', { class: cls }, obj[key] || fallback);
    return h('input', { class: `${cls} cs-lbl-in`, value: obj[key], placeholder: fallback, 'aria-label': 'Name', spellcheck: false,
      oninput: (ev) => { obj[key] = ev.target.value; commit(); },
      onkeydown: (ev) => { if (ev.key === 'Enter') ev.target.blur(); } });
  }

  // --- Edit layout ----------------------------------------------------------------------
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
  // In Edit layout every box (defaults too) gets a × (with Undo) and a grip to drag it in its list.
  function editable(key, i, name, node) {
    node.classList.add('cs-box');
    node.dataset.box = s[key][i].id;
    if (!editing) return node;
    const grip = h('span', { class: 'cs-grip', title: 'Drag to move', draggable: 'true' }, icon('grip', 'cs-ic sm'));
    node.append(grip, h('button', { type: 'button', class: 'cs-x', title: 'Remove', 'aria-label': `Remove ${name}`,
      onclick: () => change(`Removed ${name}`, () => { s[key] = s[key].filter((_, j) => j !== i); }) }, icon('close', 'cs-ic xs')));
    draggable(grip, node, 'box-' + key, i, (from, to) => change(null, () => { s[key] = S.move(s[key], from, to); }));
    return node;
  }
  // Each list ends with a dashed + button in Edit layout while there's room: "+ Stat (6/12)".
  const ADD = { details: 'Detail', pairs: 'Current / Max', boxes: 'Box', stats: 'Stat', skills: 'Skill' };
  const MAKE = { details: S.newDetail, pairs: () => S.newPair(), boxes: () => S.newBox(), stats: S.newStat, skills: S.newSkill };
  const adding = (key) => editing && S.canAdd(s, key);
  function addButton(key, cls = '') {
    if (!adding(key)) return null;
    return h('button', { type: 'button', class: 'cs-add ' + cls, onclick: () => {
      const b = MAKE[key]('');
      change(null, () => { s[key].push(b); });
      setTimeout(() => { const n = document.querySelector(`[data-box="${b.id}"] .cs-lbl-in`); if (n) n.focus(); }, 0);
    } }, `+ ${ADD[key]} (${s[key].length}/${S.CAPS[key]})`);
  }
  // Even rows (Sheet.columns): the column counts ride on CSS variables; phones use --cols-sm.
  function grid(cls, key, kids) {
    const n = s[key].length + (adding(key) && key !== 'stats' ? 1 : 0);
    return h('div', { class: cls, style: `--cols: ${S.columns(n, S.PER_ROW[key])}; --cols-sm: ${S.columns(n, 3)}` }, kids);
  }

  // --- The top section ------------------------------------------------------------------
  // The name, with the details (Hit Die, Level…) beside it.
  function header() {
    const details = s.details.map((d, i) => editable('details', i, d.label || 'detail',
      h('label', { class: 'cs-detail' }, label(d, 'label', 'Detail', 'cs-dlab'), field(d, 'value', d.label || 'Detail', 'cs-dval', { step: true }))));
    return h('div', { class: 'cs-head' },
      field(s, 'name', 'Character name', 'cs-name', { after: names }),
      h('div', { class: 'cs-details' }, details, addButton('details', 'sm')));
  }
  // Current / Max: two numbers split by a slanted line. The HP pair has the heart.
  function pair(p, i) {
    const name = p.label || 'Current';
    return editable('pairs', i, name, h('div', { class: 'cs-pair' },
      h('div', { class: 'cs-split' }, field(p, 'cur', name, 'cs-num', { step: true }), field(p, 'max', p.maxLabel || 'Max', 'cs-num', { step: true })),
      h('div', { class: 'cs-labs' }, label(p, 'label', 'Current', 'cs-lab'), label(p, 'maxLabel', 'Max', 'cs-lab')),
      p.hp ? icon('heart', 'cs-heart') : null));
  }
  // A small box (Temp HP, Armor, Initiative…): one number. Armor sits in the shield.
  function small(b, i) {
    const name = b.label || 'Box';
    const num = field(b, 'value', name, 'cs-num', { step: true });
    return editable('boxes', i, name, h('div', { class: 'cs-small' + (b.shield ? ' armor' : '') },
      b.shield ? h('div', { class: 'cs-shield' }, shield(), num) : num,
      label(b, 'label', 'Box', 'cs-lab')));
  }
  // Wounds: five circles and the skull (click to fill up to there), then 3 dashed extras.
  function wounds() {
    const dots = [];
    for (let i = 0; i < S.WOUNDS; i++) {
      const on = i < s.wounds;
      const skull = i === S.WOUNDS - 1;
      dots.push(h('button', { type: 'button', class: 'cs-w' + (on ? ' on' : '') + (skull ? ' skull' : ''), 'aria-pressed': String(on),
        'aria-label': `Wound ${i + 1}`, onclick: () => { s.wounds = S.setWounds(s.wounds, i); commit(); render(); } },
      skull ? icon('skull', 'cs-ic') : null));
    }
    const extra = s.woundMarks.map((m, i) => h('button', { type: 'button', class: 'cs-w extra' + (m ? ' on' : ''), 'aria-pressed': String(m),
      'aria-label': `Extra wound ${i + 1}`, onclick: () => { s.woundMarks[i] = !m; commit(); render(); } }));
    return h('div', { class: 'cs-wounds', role: 'group', 'aria-label': 'Wounds' }, h('div', { class: 'cs-track' }, dots), h('div', { class: 'cs-extra' }, extra));
  }
  // The save pip: ▲ advantage and ▼ disadvantage side by side, the one in use filled.
  function tri(up, on) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    n.setAttribute('viewBox', '0 0 20 18');
    n.setAttribute('class', 'cs-tri' + (on ? ' on' : ''));
    n.setAttribute('aria-hidden', 'true');
    n.innerHTML = `<path d="${up ? 'M10 2 18 16H2z' : 'M2 2h16L10 16z'}"/>`;
    return n;
  }
  function pip(st, name) {
    const lab = st.mode === 'adv' ? 'advantage' : st.mode === 'dis' ? 'disadvantage' : 'normal';
    return h('button', { type: 'button', class: 'cs-pip', title: `Save: ${lab}`, 'aria-label': `${name} save: ${lab}`,
      onclick: () => { st.mode = S.cycleSave(st.mode); commit(); render(); } }, tri(true, st.mode === 'adv'), tri(false, st.mode === 'dis'));
  }
  function stat(st, i) {
    const name = st.label || 'Stat';
    return editable('stats', i, name, h('div', { class: 'cs-stat' },
      pip(st, name), field(st, 'value', name, 'cs-num', { step: true }), label(st, 'label', 'Stat', 'cs-lab')));
  }
  function skill(k, i) {
    const name = k.label || 'Skill';
    return editable('skills', i, name, h('div', { class: 'cs-skill' },
      field(k, 'value', name, 'cs-num', { step: true }), label(k, 'label', 'Skill', 'cs-lab')));
  }
  // Vitals on the left (pairs, small boxes, wounds); stats and skills on the right.
  function top() {
    return h('section', { class: 'cs-top' },
      header(),
      h('div', { class: 'cs-cols' },
        h('div', { class: 'cs-panel cs-vitals' },
          h('div', { class: 'cs-pairs' }, s.pairs.map(pair), addButton('pairs', 'sm')),
          grid('cs-smalls', 'boxes', [s.boxes.map(small), addButton('boxes')]),
          wounds()),
        h('div', { class: 'cs-panel cs-abilities' },
          s.stats.length ? grid('cs-stats', 'stats', s.stats.map(stat)) : null,
          addButton('stats', 'sm'),
          grid('cs-skills', 'skills', [s.skills.map(skill), addButton('skills')]))));
  }

  // --- Tabs -------------------------------------------------------------------------
  // Tabs, like a browser's: click to switch, + adds one, double-click a name to rename it,
  // × closes it (with Undo), drag a tab to move it. `k` names the list (`tabs`) and `pick` the
  // current one (`tab`); `count` shows a number on each tab.
  let renaming = null;
  function tabStrip(k, pick, make, count, label) {
    const cur = s[k].find((t) => t.id === s[pick]) || s[k][0];
    const pickTab = (t) => { if (s[pick] !== t.id) { s[pick] = t.id; commit(); render(); } };
    const strip = s[k].map((t, i) => {
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
          onclick: () => pickTab(t), ondblclick: () => { renaming = t.id; s[pick] = t.id; render(); } },
        t.name || 'Untitled', count ? h('span', { class: 'cs-tabn' }, String(count(t))) : null);
      }
      const node = h('div', { class: 'cs-tab' + (on ? ' on' : ''), draggable: renaming === t.id ? 'false' : 'true' }, name,
        h('button', { type: 'button', class: 'cs-tdel', title: 'Close tab', 'aria-label': `Close ${t.name || 'tab'}`,
          onclick: () => change(`Closed ${t.name || 'tab'}`, () => {
            const at = s[k].indexOf(t);
            s[k] = s[k].filter((x) => x !== t);
            if (s[pick] === t.id) s[pick] = (s[k][Math.min(at, s[k].length - 1)] || {}).id || '';
          }) }, icon('close', 'cs-ic xs')));
      draggable(node, node, 'tab-' + k, i, (from, to) => change(null, () => { s[k] = S.move(s[k], from, to); }));
      return node;
    });
    strip.push(h('button', { type: 'button', class: 'cs-tabadd', title: label, 'aria-label': label,
      onclick: () => {
        const t = make();
        change(null, () => { s[k].push(t); s[pick] = t.id; });
        renaming = t.id;
        render();
      } }, '+'));
    if (renaming) setTimeout(() => { const n = document.querySelector('.cs-tname'); if (n && document.activeElement !== n) { n.focus(); n.select(); } }, 0);
    return { cur, strip: h('div', { class: 'cs-tabstrip', role: 'tablist' }, strip) };
  }

  // The notes (notes.js) draw with these helpers.
  const notes = window.SheetNotes({
    h, icon, change, commit, tabStrip, render: () => render(),
    get s() { return s; }, get printing() { return printing; },
  });

  function render() {
    const sheet = $('sheet');
    sheet.classList.toggle('editing', editing);
    sheet.replaceChildren(top(), notes.render());
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
    if (!(c.id in lastJson) && !c.updated) lastJson[c.id] = S.content(c); // a new blank sheet isn't an edit
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
    c.owner = ''; // a new character of yours
    show(c);
  });
  // Reset: clear this character and start again from the default layout (Undo brings it back).
  $('reset').addEventListener('click', () => {
    closeMenu();
    if (!confirm('Clear this character and start again?')) return;
    change('Reset character', () => { s = S.reset(s); all.chars[s.id] = s; }, true);
  });
  $('delete').addEventListener('click', () => {
    closeMenu();
    if (!confirm(`Delete ${s.name || 'this character'}? This can't be undone.`)) return;
    const id = s.id;
    const synced = C && C.signedIn && (s.owner === C.userId || C.synced().includes(id));
    forget([id]);
    // Queued until the account confirms it, so a delete made offline isn't undone on the next sync.
    if (synced) C.remove(id).then(() => { syncBad = false; status('Synced'); }).catch(failed);
    show(Object.values(all.chars)[0] || S.blank());
  });
  // Drop characters from this tab (deleted, or removed from this browser).
  function forget(ids) {
    for (const id of ids) {
      delete all.chars[id];
      delete lastJson[id];
      dirty.delete(id);
      deletedHere.add(id);
    }
  }
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
    if (file.size > 1000000) { alert(`Couldn't import ${file.name}: it's over 1 MB, too big for a character.`); return; }
    try { show(S.importJson(await file.text())); }
    catch (err) { alert(`Couldn't import ${file.name}: ${err.message}`); }
  });
  $('print').addEventListener('click', () => {
    closeMenu();
    printing = true;
    if (editing) setEditing(false); else render();
    window.print();
    printing = false;
    render();
  });

  // --- Sign in -------------------------------------------------------------------------
  // The toolbar's account button opens a dialog: Discord, or email + password. Signed in, it
  // shows the account's name and offers Sign out.
  const DISCORD = 'M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.1 14.1 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z';
  const dlg = $('signin');
  function accountButton() {
    const b = $('account');
    if (!C) { b.hidden = true; return; }
    b.textContent = C.signedIn ? C.name() : 'Sign in';
    b.title = C.signedIn ? 'Account' : '';
  }
  const MIN_PASSWORD = 8;
  function dialog(msg) {
    const close = h('button', { type: 'button', class: 'cs-dlg-x', 'aria-label': 'Close', onclick: () => dlg.close() }, icon('close', 'cs-ic'));
    const note = h('p', { class: 'cs-auth-msg', 'aria-live': 'polite' }, msg || '');
    const say = (t, bad) => { note.textContent = t; note.classList.toggle('bad', !!bad); };
    return { close, note, say, show: (...body) => { dlg.replaceChildren(close, ...body.filter(Boolean), note); if (!dlg.open) dlg.showModal(); } };
  }
  // After a password-reset link: choose a new password.
  function openNewPassword() {
    const d = dialog();
    const a = h('input', { type: 'password', class: 'cs-auth-in', autocomplete: 'new-password', required: true, minLength: MIN_PASSWORD, 'aria-label': 'New password' });
    const b = h('input', { type: 'password', class: 'cs-auth-in', autocomplete: 'new-password', required: true, minLength: MIN_PASSWORD, 'aria-label': 'Repeat the new password' });
    d.show(h('h2', {}, 'New password'),
      h('form', { class: 'cs-auth-form', onsubmit: async (ev) => {
        ev.preventDefault();
        if (!a.reportValidity() || !b.reportValidity()) return;
        if (a.value !== b.value) { d.say('The two passwords are different.', true); return; }
        d.say('…');
        try { await C.setPassword(a.value); d.say('Password saved.'); setTimeout(() => dlg.close(), 900); } catch (e) { d.say(e.message, true); }
      } },
      h('label', {}, h('span', { class: 'label' }, 'New password'), a),
      h('label', {}, h('span', { class: 'label' }, 'Repeat it'), b),
      h('button', { type: 'submit', class: 'btn primary' }, 'Save password')));
  }
  // The account's characters in this browser (synced to it, or marked as its own).
  const accountChars = () => Object.values(all.chars).filter((c) => c.owner === C.userId || C.synced().includes(c.id)).map((c) => c.id);
  function leaveAccount(removeHere) {
    if (removeHere) {
      forget(accountChars());
      if (!Object.keys(all.chars).length) { const b = S.blank(); all.chars[b.id] = b; lastJson[b.id] = S.content(b); }
      if (!all.chars[s.id]) s = Object.values(all.chars)[0];
      commit(); save(); names(); render();
    }
  }
  function openAccount(msg) {
    const d = dialog(msg);
    const { say } = d;
    if (C.signedIn) {
      const remove = h('input', { type: 'checkbox' });
      d.show(h('h2', {}, C.name()),
        C.user && C.user.email && C.user.email !== C.name() ? h('p', { class: 'cs-auth-sub' }, C.user.email) : null,
        h('label', { class: 'cs-check-row' }, remove, h('span', {}, 'Remove my characters from this browser when I sign out')),
        h('div', { class: 'cs-auth-row' },
          h('button', { type: 'button', class: 'btn', onclick: () => { dlg.close(); syncAll(); } }, 'Sync now'),
          h('button', { type: 'button', class: 'btn', onclick: async () => {
            await push(); // send any last edits first
            leaveAccount(remove.checked);
            await C.signOut();
            dlg.close();
          } }, 'Sign out')),
        h('button', { type: 'button', class: 'cs-link danger', onclick: async () => {
          if (!confirm('Delete your account and every character saved in it? This can\'t be undone.')) return;
          say('…');
          try {
            const ids = accountChars();
            await C.deleteAccount();
            forget(ids);
            leaveAccount(true);
            dlg.close();
            status('Account deleted');
          } catch (e) { say(e.message, true); }
        } }, 'Delete account and all its characters…'));
    } else {
      const email = h('input', { type: 'email', class: 'cs-auth-in', autocomplete: 'email', required: true, 'aria-label': 'Email' });
      const pass = h('input', { type: 'password', class: 'cs-auth-in', autocomplete: 'current-password', required: true, minLength: 6, 'aria-label': 'Password' });
      const go = (fn) => async (ev) => {
        ev.preventDefault();
        if (!email.reportValidity() || !pass.reportValidity()) return;
        say('…');
        try { await fn(email.value.trim(), pass.value); } catch (e) { say(e.message, true); }
      };
      const discord = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      discord.setAttribute('viewBox', '0 0 24 24');
      discord.setAttribute('class', 'cs-ic');
      discord.setAttribute('aria-hidden', 'true');
      discord.innerHTML = `<path fill="currentColor" d="${DISCORD}"/>`;
      d.show(h('h2', {}, 'Sign in'),
        h('button', { type: 'button', class: 'btn cs-discord', onclick: () => C.discord().catch((e) => say(e.message, true)) }, discord, 'Continue with Discord'),
        h('div', { class: 'cs-or' }, h('span', {}, 'or')),
        h('form', { class: 'cs-auth-form', onsubmit: go(async (e, p) => { await C.signIn(e, p); dlg.close(); syncAll(); }) },
          h('label', {}, h('span', { class: 'label' }, 'Email'), email),
          h('label', {}, h('span', { class: 'label' }, 'Password'), pass),
          h('div', { class: 'cs-auth-row' },
            h('button', { type: 'submit', class: 'btn primary' }, 'Sign in'),
            h('button', { type: 'button', class: 'btn', onclick: go(async (e, p) => {
              if (p.length < MIN_PASSWORD) { say(`Use a password of at least ${MIN_PASSWORD} characters.`, true); return; }
              if (await C.signUp(e, p)) { dlg.close(); syncAll(); } else say('Check your email to confirm your account, then sign in.');
            }) }, 'Create account'))),
        h('button', { type: 'button', class: 'cs-link', onclick: async () => {
          if (!email.reportValidity()) return;
          say('…');
          try { await C.resetPassword(email.value.trim()); say('Check your email for a link to set a new password.'); } catch (e) { say(e.message, true); }
        } }, 'Forgot password?'));
    }
  }
  if (C) {
    $('account').addEventListener('click', () => openAccount());
    C.onChange((session, why) => {
      accountButton();
      // The session ended by itself (expired, revoked, account deleted elsewhere): say so; edits stay here.
      if (why === 'expired') status('Signed out. Sign in to sync', true);
    });
  }
  accountButton();

  names();
  render();
  commit();
  if (C) {
    // Back from Discord (or an email confirmation link): finish signing in, then sync.
    C.finishRedirect()
      .then((done) => {
        if (done === 'recovery') openNewPassword();
        if (done || C.signedIn) syncAll();
      })
      .catch((e) => openAccount(e.message));
  }
})();
