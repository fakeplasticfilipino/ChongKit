// Chong's Tracker: the panel (Owlbear action popover).
// State lives in the scene's metadata (see core.js). This file only draws it and writes changes.
import OBR from './vendor/obr-sdk.js';

const C = window.ChongCore;
const $ = (id) => document.getElementById(id);
const TAB_STORE = `${C.NS}/tab`; // last-open tab, per browser (the background page reads it too)

let role = 'PLAYER';
let tabs = [{ id: C.PLAYERS_TAB, name: 'Players' }];
let entries = [];
let current = C.PLAYERS_TAB;
let renamingTab = null;
const open = new Set(); // expanded entries
let dirty = false;
let sceneReady = false; // a render was skipped while the user was typing

// --- Icons (Material Symbols paths) ------------------------------------------------
const ICON = {
  eye: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  eyeOff: 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
  link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
  linkOff: 'M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.43-.98 2.63-2.31 2.98l1.46 1.46C20.88 15.61 22 13.95 22 12c0-2.76-2.24-5-5-5zm-1 4h-2.19l2 2H16zM2 4.27l3.11 3.11C3.29 8.12 2 9.91 2 12c0 2.76 2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1 0-1.59 1.21-2.9 2.76-3.07L8.73 11H8v2h2.73L13 15.27V17h1.73l4.01 4L20 19.74 3.27 3 2 4.27z',
  down: 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
  up: 'M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  pin: 'M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z',
};
const svg = (name) => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="${ICON[name]}"/></svg>`;
function iconButton(name, title, onClick, on = false) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'icon' + (on ? ' on' : '');
  b.title = title;
  b.setAttribute('aria-label', title);
  b.innerHTML = svg(name);
  b.addEventListener('click', onClick);
  return b;
}
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  kids.flat().forEach((k) => k != null && n.append(k));
  return n;
};

// --- Writing ------------------------------------------------------------------------
const byId = (id) => entries.find((e) => e.id === id);
async function write(patch) {
  try { await OBR.scene.setMetadata(patch); }
  catch (err) { OBR.notification.show(`Chong's Tracker couldn't save: ${err.message || err}`, 'ERROR'); }
}
function saveEntries(list) {
  const patch = {};
  for (const e of list) {
    Object.assign(patch, C.entryPatch(e));
    const i = entries.findIndex((x) => x.id === e.id);
    if (i >= 0) entries[i] = e; else entries.push(e);
  }
  render();
  return write(patch);
}
const saveEntry = (e) => saveEntries([e]);
// Merge a change into the LATEST copy of an entry (it may have changed since it was drawn).
function updateEntry(e, patch) {
  const cur = byId(e.id);
  if (!cur) return;
  return saveEntry({ ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) });
}
function deleteEntries(ids) {
  const patch = {};
  ids.forEach((id) => Object.assign(patch, C.deletePatch(id)));
  entries = entries.filter((e) => !ids.includes(e.id));
  render();
  return write(patch);
}
function saveTabs(next) {
  tabs = next;
  render();
  return write(C.tabsPatch(next));
}

// --- Actions ------------------------------------------------------------------------
function setTab(id) {
  current = id;
  try { localStorage.setItem(TAB_STORE, id); } catch {}
  render();
}

function addTab() {
  const id = C.uid();
  saveTabs([...tabs, { id, name: `Tab ${tabs.length}` }]);
  renamingTab = id;
  setTab(id);
}

function removeTab(tab) {
  const inTab = entries.filter((e) => e.tab === tab.id);
  if (inTab.length && !confirm(`Delete "${tab.name}" and its ${inTab.length} entr${inTab.length === 1 ? 'y' : 'ies'}?`)) return;
  if (inTab.length) deleteEntries(inTab.map((e) => e.id));
  saveTabs(tabs.filter((t) => t.id !== tab.id));
  setTab(C.PLAYERS_TAB);
}

function runCommand(text) {
  const { rows, errors } = C.parseCommand(text);
  if (errors.length) OBR.notification.show(`Couldn't read: ${errors.join(' / ')}`, 'WARNING');
  if (!rows.length) return false;
  const order = Math.max(0, ...entries.filter((e) => e.tab === current).map((e) => e.order + 1));
  saveEntries(C.rowsToEntries(rows, { tab: current, order }));
  return true;
}

// Attach the selected token(s). With several selected, the next unattached entries in this tab
// (starting at this one) are attached in order: select 4 goblins, attach "Goblin 1".
async function attach(entry) {
  const sel = (await OBR.player.getSelection()) || [];
  if (!sel.length) { OBR.notification.show('Select a token first'); return; }
  const free = sel.filter((id) => !entries.some((e) => e.token === id && e.id !== entry.id));
  const list = entries.filter((e) => e.tab === entry.tab);
  const start = list.indexOf(entry);
  const targets = [entry, ...list.slice(start + 1).filter((e) => !e.token && C.canEdit(e, role))];
  saveEntries(free.slice(0, targets.length).map((token, i) => ({ ...targets[i], token })));
}

// HP-style input: math on Enter or blur, Escape reverts.
function mathInput(cls, value, onCommit, disabled) {
  const inp = el('input', { className: cls, value: value ?? '', disabled, inputMode: 'text', spellcheck: false });
  let start = inp.value;
  inp.addEventListener('focus', () => {
    start = inp.value;
    const end = inp.value.length;
    setTimeout(() => inp.setSelectionRange(end, end), 0);
  });
  const commit = () => { if (inp.value.trim() !== start.trim()) onCommit(inp.value); };
  inp.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { commit(); start = inp.value; inp.blur(); }
    if (ev.key === 'Escape') { inp.value = start; inp.blur(); }
  });
  inp.addEventListener('blur', commit);
  return inp;
}

// --- Rendering ------------------------------------------------------------------------
const visibleEntries = () => entries.filter((e) => C.canSee(e, role));
function visibleTabs() {
  if (role === 'GM') return tabs;
  const seen = new Set(visibleEntries().map((e) => e.tab));
  return tabs.filter((t) => t.id === C.PLAYERS_TAB || seen.has(t.id));
}

function render() {
  // Don't rebuild under someone's cursor; catch up when they leave the field.
  const a = document.activeElement;
  if (document.hasFocus() && a && a !== document.body && document.body.contains(a) && a.matches('input, textarea, select') && !a.closest('#tabs')) {
    dirty = true;
    a.addEventListener('blur', catchUp, { once: true });
    return;
  }
  dirty = false;
  if (!sceneReady) {
    $('tabs').replaceChildren();
    $('bar').replaceChildren();
    renderList();
    return;
  }
  if (!visibleTabs().some((t) => t.id === current)) current = C.PLAYERS_TAB;
  renderTabs();
  renderBar();
  renderList();
}
let pointerDown = false;
function catchUp() { setTimeout(() => { if (dirty && !pointerDown) render(); }, 0); }
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
document.addEventListener('pointerup', () => { pointerDown = false; catchUp(); }, true);
document.addEventListener('focusout', catchUp);

function renderTabs() {
  const nav = $('tabs');
  nav.replaceChildren();
  for (const t of visibleTabs()) {
    const active = t.id === current;
    const b = el('button', { type: 'button', className: 'tab' + (active ? ' active' : '') });
    if (renamingTab === t.id) {
      const inp = el('input', { value: t.name });
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        renamingTab = null;
        const name = inp.value.trim() || t.name;
        saveTabs(tabs.map((x) => (x.id === t.id ? { ...x, name } : x)));
      };
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') inp.value = t.name;
        if (ev.key === 'Enter' || ev.key === 'Escape') done();
      });
      inp.addEventListener('blur', done);
      b.append(inp);
      nav.append(b);
      setTimeout(() => { inp.focus(); inp.select(); }, 0);
      continue;
    }
    b.append(t.name);
    b.addEventListener('click', () => setTab(t.id));
    if (role === 'GM' && t.id !== C.PLAYERS_TAB) {
      b.addEventListener('dblclick', () => { renamingTab = t.id; render(); });
      if (active) {
        const x = iconButton('close', 'Delete tab', (ev) => { ev.stopPropagation(); removeTab(t); });
        x.classList.add('x');
        b.append(x);
      }
    }
    nav.append(b);
  }
  if (role === 'GM') nav.append(iconButton('add', 'New tab', addTab));
}

function renderBar() {
  const bar = $('bar');
  bar.replaceChildren();
  const canAdd = role === 'GM' || current === C.PLAYERS_TAB;
  if (!canAdd) return;
  const box = el('textarea', { rows: 1, placeholder: 'Goblin x4 15', spellcheck: false });
  const grow = () => { box.style.height = 'auto'; box.style.height = Math.min(120, Math.max(32, box.scrollHeight + 2)) + 'px'; };
  box.addEventListener('input', grow);
  box.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      if (runCommand(box.value)) { box.value = ''; grow(); }
    }
  });
  bar.append(box, iconButton('add', 'Add', () => { if (runCommand(box.value)) { box.value = ''; grow(); } }));
  if (role === 'GM' && current !== C.PLAYERS_TAB) {
    const inTab = entries.filter((e) => e.tab === current);
    const anyHidden = inTab.some((e) => e.hidden);
    bar.append(iconButton(anyHidden ? 'eyeOff' : 'eye', anyHidden ? 'Show all to players' : 'Hide all from players',
      () => saveEntries(inTab.map((e) => ({ ...e, hidden: !anyHidden }))), !anyHidden));
  }
}

function renderList() {
  const list = $('list');
  const shown = visibleEntries().filter((e) => e.tab === current);
  list.replaceChildren(...shown.map(renderEntry));
  const empty = $('empty');
  empty.hidden = shown.length > 0;
  empty.textContent = sceneReady ? 'No entries' : 'No scene';
}

function renderEntry(e) {
  const edit = C.canEdit(e, role);
  const isOpen = open.has(e.id);
  const wrap = el('div', { className: 'entry' + (isOpen ? ' open' : '') + (e.hidden ? ' hidden-entry' : '') });
  const row = el('div', { className: 'row' });

  if (role === 'GM') {
    row.append(iconButton(e.hidden ? 'eyeOff' : 'eye', e.hidden ? 'Hidden from players' : 'Shown to players',
      () => updateEntry(e, { hidden: !e.hidden }), !e.hidden));
  }
  const name = el('input', { className: 'name', value: e.name, disabled: !edit, spellcheck: false });
  name.addEventListener('change', () => updateEntry(e, { name: name.value.trim() || e.name }));
  name.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') name.blur(); });
  row.append(name);

  const hpBox = el('div', { className: 'hpbox' });
  if (e.extra > 0) hpBox.append(el('span', { className: 'xp', title: 'Extra HP', textContent: `+${e.extra}` }));
  hpBox.append(mathInput('hp', e.hp, (text) => {
    const change = C.readInput(text, e.hp);
    if (!change) { render(); return; }
    updateEntry(e, (x) => C.applyHp(x, change));
  }, !edit));
  hpBox.append(el('span', { className: 'max', textContent: e.max != null ? `/${e.max}` : '' }));
  row.append(hpBox);

  if (edit) {
    row.append(e.token
      ? iconButton('link', 'Attached: click to detach', () => updateEntry(e, { token: null }), true)
      : iconButton('linkOff', 'Attach selected token', () => attach(e)));
    row.append(iconButton(isOpen ? 'up' : 'down', isOpen ? 'Less' : 'More', () => {
      if (isOpen) open.delete(e.id); else open.add(e.id);
      render();
    }));
  }
  wrap.append(row);
  if (isOpen && edit) wrap.append(renderMore(e));
  return wrap;
}

function renderMore(e) {
  const more = el('div', { className: 'more' });

  // The three built-in values.
  const max = mathInput('', e.max, (text) => {
    const t = text.trim();
    const v = t === '' ? null : C.evalExpr(t);
    if (t !== '' && v === null) { render(); return; }
    updateEntry(e, { max: v === null ? null : Math.trunc(v) });
  });
  const extra = mathInput('', e.extra || 0, (text) => {
    const change = C.readInput(text, e.extra || 0);
    if (!change) { render(); return; }
    const v = change.kind === 'set' ? change.value : (e.extra || 0) + change.value;
    updateEntry(e, { extra: Math.max(0, v) });
  });
  const ac = el('input', { value: e.ac || '', spellcheck: false });
  ac.addEventListener('change', () => updateEntry(e, { ac: ac.value.trim() }));
  ac.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') ac.blur(); });
  more.append(el('div', { className: 'fields' },
    el('label', { className: 'field' }, el('span', { textContent: 'Max HP' }), max),
    el('label', { className: 'field' }, el('span', { textContent: 'Extra HP' }), extra),
    el('label', { className: 'field' }, el('span', { textContent: 'AC' }), ac)));

  // Custom counters.
  for (const c of e.counters || []) more.append(renderCounter(e, c));

  const type = el('select', {},
    el('option', { value: 'number', textContent: 'Number' }),
    el('option', { value: 'slider', textContent: 'Slider' }),
    el('option', { value: 'check', textContent: 'Checkbox' }));
  const addCounter = el('button', { type: 'button', className: 'btn', textContent: '+ Counter' });
  addCounter.addEventListener('click', () => updateEntry(e, (x) => ({ counters: [...(x.counters || []), C.newCounter(type.value)] })));

  const actions = el('div', { className: 'actions' }, type, addCounter, el('span', { className: 'grow' }));
  if (role === 'GM') {
    const move = el('select', { title: 'Move to tab' }, ...tabs.map((t) => el('option', { value: t.id, textContent: t.name, selected: t.id === e.tab })));
    move.addEventListener('change', () => updateEntry(e, { tab: move.value, hidden: move.value === C.PLAYERS_TAB ? false : e.hidden }));
    actions.append(move);
  }
  const del = el('button', { type: 'button', className: 'btn danger', textContent: 'Delete' });
  del.addEventListener('click', () => { open.delete(e.id); deleteEntries([e.id]); });
  actions.append(del);
  more.append(actions);
  return more;
}

function renderCounter(e, c) {
  const update = (patch) => updateEntry(e, (x) => ({ counters: x.counters.map((k) => (k.id === c.id ? { ...k, ...patch } : k)) }));
  const row = el('div', { className: 'counter' });
  const name = el('input', { className: 'cname', value: c.name, placeholder: 'Name', spellcheck: false });
  name.addEventListener('change', () => update({ name: name.value.trim() }));
  name.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') name.blur(); });
  row.append(name);

  if (c.type === 'check') {
    const box = el('input', { type: 'checkbox', checked: !!c.value });
    box.addEventListener('change', () => update({ value: box.checked }));
    row.append(box);
  } else if (c.type === 'slider') {
    const range = el('input', { type: 'range', min: c.min ?? 0, max: c.max, step: 1, value: c.value });
    const out = el('span', { className: 'out', textContent: `${c.value}` });
    range.addEventListener('input', () => { out.textContent = range.value; });
    range.addEventListener('change', () => update({ value: Number(range.value) }));
    const cmax = mathInput('cmax', c.max, (text) => {
      const v = C.evalExpr(text);
      if (v === null || v < 1) { render(); return; }
      const m = Math.trunc(v);
      update({ max: m, value: Math.min(c.value, m) });
    });
    cmax.title = 'Max';
    row.append(range, out, cmax);
  } else {
    row.append(mathInput('cval', c.value, (text) => {
      const change = C.readInput(text, c.value);
      if (!change) { render(); return; }
      update({ value: change.kind === 'set' ? change.value : c.value + change.value });
    }));
  }
  row.append(iconButton('pin', c.show ? 'Shown on token' : 'Show on token', () => update({ show: !c.show }), c.show));
  row.append(iconButton('close', 'Remove counter', () => updateEntry(e, (x) => ({ counters: x.counters.filter((k) => k.id !== c.id) }))));
  return row;
}

// --- Owlbear wiring ---------------------------------------------------------------------
function applyTheme(theme) {
  const r = document.documentElement.style;
  document.documentElement.dataset.mode = theme.mode;
  r.setProperty('--text', theme.text.primary);
  r.setProperty('--text2', theme.text.secondary);
  r.setProperty('--muted', theme.text.disabled);
  r.setProperty('--primary', theme.primary.main);
  r.setProperty('--paper', theme.background.paper);
}

function loadScene(metadata) {
  sceneReady = true;
  ({ tabs, entries } = C.readState(metadata));
  render();
}

if (!OBR.isAvailable) {
  document.documentElement.classList.add('page');
  $('standalone').hidden = false;
  $('manifest-url').textContent = new URL('manifest.json', location.href).href;
} else {
  OBR.onReady(async () => {
    try { current = localStorage.getItem(TAB_STORE) || C.PLAYERS_TAB; } catch {}
    role = await OBR.player.getRole();
    applyTheme(await OBR.theme.getTheme());
    OBR.theme.onChange(applyTheme);
    OBR.player.onChange((p) => { if (p.role !== role) { role = p.role; render(); } });

    const start = async () => loadScene(await OBR.scene.getMetadata());
    OBR.scene.onMetadataChange(loadScene);
    OBR.scene.onReadyChange((ready) => { if (ready) start(); else { sceneReady = false; entries = []; render(); } });
    if (await OBR.scene.isReady()) start(); else render();
  });
}
