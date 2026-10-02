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
let dirty = false; // a render was skipped while the user was typing
let sceneReady = false;
let picking = null; // entry waiting for a token click on the map
let tokens = new Map();
let helpOpen = false;

// --- Icons (Material Symbols paths) ------------------------------------------------
const ICON = {
  eye: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  eyeOff: 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  more: 'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  info: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
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

// Attaching: click an entry's empty token circle, then click a token on the map.
// Box-select several tokens and the next unattached entries in this tab (starting at this one)
// are attached in order: click "Goblin 1", then box-select 4 goblins.
async function startPick(entry) {
  if (picking === entry.id) { picking = null; render(); return; }
  picking = entry.id;
  render();
  try { await OBR.player.deselect(); } catch {}
}
async function finishPick(sel) {
  const entry = byId(picking);
  picking = null;
  if (!entry) { render(); return; }
  const items = await OBR.scene.items.getItems(sel);
  const ids = items.filter((i) => i.type === 'IMAGE').map((i) => i.id);
  const free = ids.filter((id) => !entries.some((e) => e.token === id && e.id !== entry.id));
  if (!free.length) {
    if (ids.length) OBR.notification.show('That token is already tracked');
    render();
    return;
  }
  const list = entries.filter((e) => e.tab === entry.tab);
  const start = list.indexOf(entry);
  const targets = [entry, ...list.slice(start + 1).filter((e) => !tokenOf(e) && C.canEdit(e, role))];
  saveEntries(free.slice(0, targets.length).map((token, i) => ({ ...targets[i], token })));
}
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && picking) { picking = null; render(); } });

// Attached tokens that still exist on the map (id -> { url, name }).
const tokenOf = (e) => (e.token && tokens.get(e.token)) || null;
function readTokens(items) {
  const want = new Set(entries.map((e) => e.token).filter(Boolean));
  const next = new Map();
  for (const i of items) if (want.has(i.id)) next.set(i.id, { url: i.image && i.image.url, name: i.name });
  const changed = next.size !== tokens.size || [...next].some(([id, t]) => {
    const old = tokens.get(id);
    return !old || old.url !== t.url;
  });
  tokens = next;
  if (changed) render();
}
async function refreshTokens() {
  const ids = [...new Set(entries.map((e) => e.token).filter(Boolean))];
  readTokens(ids.length ? await OBR.scene.items.getItems(ids) : []);
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
    $('help').hidden = true;
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
  $('help').hidden = !(canAdd && helpOpen);
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
  bar.append(iconButton('info', 'Commands', () => { helpOpen = !helpOpen; render(); }, helpOpen));
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
  const isOpen = open.has(e.id) && edit;
  const wrap = el('div', { className: 'entry' + (isOpen ? ' open' : '') + (e.hidden ? ' hidden-entry' : '') });
  const row = el('div', { className: 'row' });

  row.append(renderAvatar(e, edit));
  const name = el('input', { className: 'name', value: e.name, disabled: !edit, spellcheck: false });
  name.addEventListener('change', () => updateEntry(e, { name: name.value.trim() || e.name }));
  name.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') name.blur(); });
  row.append(name);
  if (role === 'GM' && e.hidden) row.append(el('span', { className: 'flag', title: 'Hidden from players', innerHTML: svg('eyeOff') }));

  if (e.extra > 0) row.append(el('span', { className: 'xp', title: 'Extra HP', textContent: `+${e.extra}` }));
  const hp = el('div', { className: 'hp' }, el('span', { className: 'fill', style: `width:${C.hpFraction(e) * 100}%` }));
  hp.append(mathInput('', e.hp, (text) => {
    const change = C.readInput(text, e.hp);
    if (!change) { render(); return; }
    updateEntry(e, (x) => C.applyHp(x, change));
  }, !edit));
  row.append(hp);

  if (edit) {
    row.append(iconButton('more', isOpen ? 'Close' : 'More', () => {
      if (isOpen) open.delete(e.id); else open.add(e.id);
      render();
    }, isOpen));
  }
  wrap.append(row);
  if (isOpen) wrap.append(renderMore(e));
  return wrap;
}

// The token's picture; an empty circle with + when nothing is attached.
function renderAvatar(e, edit) {
  const t = tokenOf(e);
  const pick = picking === e.id;
  const b = el('button', { type: 'button', className: 'avatar' + (t ? '' : ' blank') + (pick ? ' picking' : ''), disabled: !edit && !t });
  if (t && t.url) b.append(el('img', { src: t.url, alt: '', draggable: false }));
  else if (!t && edit) b.innerHTML = svg('add');
  if (pick) b.title = 'Click a token on the map (Esc to cancel)';
  else if (t) b.title = 'Select on map';
  else if (edit) b.title = 'Attach a token';
  b.addEventListener('click', () => {
    if (t) OBR.player.select([e.token], true);
    else if (edit) startPick(e);
  });
  return b;
}

function renderMore(e) {
  const more = el('div', { className: 'more' });

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

  const actions = el('div', { className: 'actions' });
  if (role === 'GM') {
    const vis = el('button', { type: 'button', className: 'btn' + (e.hidden ? '' : ' on'), innerHTML: svg(e.hidden ? 'eyeOff' : 'eye') });
    vis.append(e.hidden ? 'Hidden' : 'Shown');
    vis.title = e.hidden ? 'Hidden from players: click to show' : 'Shown to players: click to hide';
    vis.addEventListener('click', () => updateEntry(e, { hidden: !e.hidden }));
    actions.append(vis);
  }
  if (e.token) {
    const detach = el('button', { type: 'button', className: 'btn', textContent: 'Detach' });
    detach.addEventListener('click', () => updateEntry(e, { token: null }));
    actions.append(detach);
  }
  if (role === 'GM') {
    const move = el('select', { title: 'Move to tab' }, ...tabs.map((t) => el('option', { value: t.id, textContent: t.name, selected: t.id === e.tab })));
    move.addEventListener('change', () => updateEntry(e, { tab: move.value, hidden: move.value === C.PLAYERS_TAB ? false : e.hidden }));
    actions.append(move);
  }
  actions.append(el('span', { className: 'grow' }));
  const del = el('button', { type: 'button', className: 'btn danger', textContent: 'Delete' });
  del.addEventListener('click', () => { open.delete(e.id); deleteEntries([e.id]); });
  actions.append(del);
  more.append(actions);
  return more;
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
  refreshTokens().catch(() => {});
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
    OBR.player.onChange((p) => {
      if (p.role !== role) { role = p.role; render(); }
      if (picking && p.selection && p.selection.length) finishPick(p.selection);
    });

    const start = async () => loadScene(await OBR.scene.getMetadata());
    OBR.scene.onMetadataChange(loadScene);
    OBR.scene.items.onChange(readTokens);
    OBR.scene.onReadyChange((ready) => { if (ready) start(); else { sceneReady = false; entries = []; tokens = new Map(); picking = null; render(); } });
    if (await OBR.scene.isReady()) start(); else render();
  });
}
