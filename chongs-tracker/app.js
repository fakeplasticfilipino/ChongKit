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
let pickAdd = false; // ...adding to its tokens rather than replacing them
let tokens = new Map();
let helpOpen = false;
let focus = []; // entries whose tokens are selected on the map: shown first while selected

// --- Icons (Material Symbols paths) ------------------------------------------------
const ICON = {
  eye: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  eyeOff: 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  more: 'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  shield: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
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
  entries.sort((a, b) => (a.order - b.order) || String(a.name).localeCompare(String(b.name)));
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
// Each tab is its own metadata key, so tabs changed by different people never overwrite each other.
function saveTab(tab) {
  const i = tabs.findIndex((t) => t.id === tab.id);
  tabs = i >= 0 ? tabs.map((t, k) => (k === i ? tab : t)) : [...tabs, tab];
  render();
  return write(C.tabPatch(tab));
}

// --- Actions ------------------------------------------------------------------------
function setTab(id) {
  current = id;
  try { localStorage.setItem(TAB_STORE, id); } catch {}
  render();
}

const tabById = (id) => tabs.find((t) => t.id === id);
// GMs manage every tab; players manage the tabs players made. Nobody deletes the Players tab.
const canManageTab = (t) => t.id !== C.PLAYERS_TAB && (role === 'GM' || !!t.players);

function addTab() {
  const id = C.uid();
  const tab = { id, name: `Tab ${tabs.length}`, order: Math.max(0, ...tabs.map((t) => t.order || 0)) + 1 };
  if (role !== 'GM') tab.players = true;
  saveTab(tab);
  renamingTab = id;
  setTab(id);
}

function removeTab(tab) {
  const inTab = entries.filter((e) => e.tab === tab.id);
  if (inTab.length && !confirm(`Delete "${tab.name}" and its ${inTab.length} entr${inTab.length === 1 ? 'y' : 'ies'}?`)) return;
  if (inTab.length) deleteEntries(inTab.map((e) => e.id));
  tabs = tabs.filter((t) => t.id !== tab.id);
  write(C.tabDeletePatch(tab.id));
  setTab(C.PLAYERS_TAB);
}

function runCommand(text) {
  const clear = C.parseClear(text);
  if (clear) return runClear(clear);
  const { rows, errors } = C.parseCommand(text);
  if (errors.length) OBR.notification.show(`Couldn't read: ${errors.join(' / ')}`, 'WARNING');
  if (!rows.length) return false;
  const order = Math.max(0, ...entries.filter((e) => e.tab === current).map((e) => e.order + 1));
  const hidden = C.isPlayerTab(tabById(current)) ? false : undefined;
  saveEntries(C.rowsToEntries(rows, { tab: current, order, hidden }));
  return true;
}

// /clear: delete every entry in this tab (or those whose names start with the given text). GM only.
function runClear(clear) {
  if (role !== 'GM') { OBR.notification.show('Only the GM can clear entries', 'WARNING'); return false; }
  const hit = entries.filter((e) => e.tab === current && C.clearMatches(e, clear));
  if (!hit.length) { OBR.notification.show('Nothing to clear'); return true; }
  if (!confirm(`Delete ${hit.length} entr${hit.length === 1 ? 'y' : 'ies'} from this tab?`)) return false;
  hit.forEach((e) => open.delete(e.id));
  deleteEntries(hit.map((e) => e.id));
  return true;
}

// Attaching works both ways: select token(s) then click an entry's empty circle, or click the
// circle then click a token on the map. Several tokens attach to this entry and the next
// unattached ones in this tab, in order: box-select 4 goblins, click "Goblin 1".
async function startPick(entry, add = false) {
  if (picking === entry.id) { picking = null; render(); return; }
  picking = entry.id;
  pickAdd = add;
  const sel = (await OBR.player.getSelection()) || [];
  if (sel.length && (await OBR.scene.items.getItems(sel)).some((i) => i.type === 'IMAGE')) {
    finishPick(sel);
    return;
  }
  render();
  try { await OBR.player.deselect(); } catch {}
}
async function finishPick(sel) {
  const entry = byId(picking);
  picking = null;
  if (!entry) { render(); return; }
  const items = await OBR.scene.items.getItems(sel);
  const ids = items.filter((i) => i.type === 'IMAGE').map((i) => i.id);
  const free = ids.filter((id) => !entries.some((e) => e.id !== entry.id && C.tokensOf(e).includes(id)));
  if (!free.length) {
    if (ids.length) OBR.notification.show('That token is already tracked');
    render();
    return;
  }
  // Minion groups (and "Add token" in the menu) take every picked token; other entries take one
  // each, filling the next unattached entries in order.
  if (entry.group || pickAdd) {
    saveEntry(C.withTokens(entry, [...(pickAdd ? C.tokensOf(entry) : []), ...free]));
    return;
  }
  const list = entries.filter((e) => e.tab === entry.tab);
  const start = list.indexOf(entry);
  const targets = [entry, ...list.slice(start + 1).filter((e) => !tokenOf(e) && C.canEdit(e, role, tabs))];
  saveEntries(free.slice(0, targets.length).map((token, i) => C.withTokens(targets[i], [token])));
}
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && picking) { picking = null; render(); } });

// Selecting tracked tokens on the map brings their entries to the top of the list (switching to
// their tab if needed) until the selection changes.
function focusSelected(sel) {
  const firstPick = (e) => Math.min(...C.tokensOf(e).map((t) => sel.indexOf(t)).filter((i) => i >= 0));
  const next = visibleEntries()
    .filter((e) => C.tokensOf(e).some((t) => sel.includes(t)))
    .sort((a, b) => firstPick(a) - firstPick(b))
    .map((e) => e.id);
  if (next.join() === focus.join()) return;
  focus = next;
  if (!focus.length) { render(); return; }
  const tabsOf = focus.map((id) => byId(id).tab);
  if (tabsOf.includes(current)) render(); else setTab(tabsOf[0]);
  document.scrollingElement.scrollTop = 0;
}

// Attached tokens that still exist on the map (id -> { url, name }).
const allTokens = () => new Set(entries.flatMap(C.tokensOf));
const liveTokens = (e) => C.tokensOf(e).filter((id) => tokens.has(id));
const tokenOf = (e) => tokens.get(liveTokens(e)[0]) || null;
function readTokens(items) {
  const want = allTokens();
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
  const ids = [...allTokens()];
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
// Everyone sees every entry (players see H/B for hidden stats). Players see their own tabs and
// any GM tab with something in it.
const visibleEntries = () => entries;
function visibleTabs() {
  if (role === 'GM') return tabs;
  const seen = new Set(entries.map((e) => e.tab));
  return tabs.filter((t) => C.isPlayerTab(t) || seen.has(t.id));
}

function render() {
  // Don't rebuild under someone's cursor; catch up when they leave the field.
  // The add box is the exception: the list redraws right away while you keep typing there.
  if (dragging) { dirty = true; return; } // redrawn on drop
  const a = document.activeElement;
  const typing = document.hasFocus() && a && a !== document.body && document.body.contains(a) && a.matches('input, textarea, select');
  const inBar = typing && !!a.closest('#bar');
  if (typing && !inBar && !a.closest('#tabs')) {
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
  if (inBar) { // keep the add box (and what's typed in it); refresh its buttons once it's left
    dirty = true;
    a.addEventListener('blur', catchUp, { once: true });
  } else renderBar();
  renderList();
}
let pointerDown = false;
function catchUp() { setTimeout(() => { if (dirty && !pointerDown) render(); }, 0); }
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
document.addEventListener('pointerup', () => { pointerDown = false; catchUp(); }, true);
// A press that ends outside the panel never sends pointerup here: don't stay stuck waiting for it.
for (const ev of ['pointercancel', 'blur']) window.addEventListener(ev, () => { pointerDown = false; catchUp(); });
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
        saveTab({ ...t, name });
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
    if (canManageTab(t)) {
      b.addEventListener('dblclick', () => { renamingTab = t.id; render(); });
      if (active) {
        const x = iconButton('close', 'Delete tab', (ev) => { ev.stopPropagation(); removeTab(t); });
        x.classList.add('x');
        b.append(x);
      }
    }
    nav.append(b);
  }
  nav.append(iconButton('add', 'New tab', addTab));
}

function renderBar() {
  const bar = $('bar');
  bar.replaceChildren();
  const canAdd = role === 'GM' || C.isPlayerTab(tabById(current));
  $('help').hidden = !(canAdd && helpOpen);
  $('help').classList.toggle('gm', role === 'GM');
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
    bar.append(iconButton(anyHidden ? 'eyeOff' : 'eye', anyHidden ? 'Show all stats to players' : 'Hide all stats from players',
      () => saveEntries(inTab.map((e) => ({ ...e, hidden: !anyHidden }))), !anyHidden));
  }
}

function renderList() {
  const list = $('list');
  let shown = visibleEntries().filter((e) => e.tab === current);
  const first = focus.map(byId).filter((e) => shown.includes(e));
  shown = [...first, ...shown.filter((e) => !first.includes(e))];
  list.replaceChildren(...shown.map(renderEntry));
  const empty = $('empty');
  empty.hidden = shown.length > 0;
  empty.textContent = sceneReady ? 'No entries' : 'No scene';
}

function renderEntry(e) {
  const edit = C.canEdit(e, role, tabs);
  const mask = C.masked(e, role);
  const isOpen = open.has(e.id) && edit;
  const wrap = el('div', { className: 'entry' + (isOpen ? ' open' : '') + (e.hidden && role === 'GM' ? ' hidden-entry' : '') + (focus.includes(e.id) ? ' focus' : '') });
  wrap.dataset.id = e.id;
  const row = el('div', { className: 'row' });

  row.append(renderAvatar(e, edit));
  const name = el('input', { className: 'name', value: e.name, disabled: !edit, spellcheck: false });
  name.addEventListener('change', () => updateEntry(e, { name: name.value.trim() || e.name }));
  name.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') name.blur(); });
  row.append(name);
  const many = liveTokens(e).length;
  if (many > 1) row.append(el('span', { className: 'count', title: `${many} tokens`, textContent: `×${many}` }));
  if (role === 'GM' && e.hidden) row.append(el('span', { className: 'flag', title: 'Stats hidden from players', innerHTML: svg('eyeOff') }));

  // Players can't open the menu on others' entries, so their AC shows in the row.
  if (!edit && e.ac) row.append(el('span', { className: 'ac', title: 'AC', innerHTML: svg('shield') }, e.ac));
  if (mask) {
    const st = C.hpStatus(e);
    row.append(el('div', { className: 'hp status' + (st === 'B' ? ' bloodied' : ''), title: st === 'B' ? 'Bloodied' : 'Healthy', textContent: st }));
    wrap.append(row);
    return wrap;
  }
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
  if (edit) movable(wrap, e, name);
  return wrap;
}

// Drag a card to reorder: grab it anywhere except its buttons and boxes (the name works too
// until you click into it). A short press on the name still just edits it.
let dragging = null;
function movable(wrap, e, name) {
  wrap.classList.add('movable');
  name.addEventListener('mousedown', (ev) => { if (document.activeElement !== name) ev.preventDefault(); });
  wrap.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    const onName = ev.target === name && document.activeElement !== name;
    if (!onName && ev.target.closest('button, input, select, textarea, label')) return;
    const y0 = ev.clientY;
    let started = false, target = null;
    const marks = () => wrap.parentElement.querySelectorAll('.drop-before, .drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
    const move = (mv) => {
      if (!started) {
        if (Math.abs(mv.clientY - y0) < 6) return;
        started = true;
        dragging = e.id;
        try { wrap.setPointerCapture(ev.pointerId); } catch {}
        wrap.classList.add('dragging');
      }
      wrap.style.transform = `translateY(${mv.clientY - y0}px)`;
      const others = [...wrap.parentElement.children].filter((n) => n !== wrap);
      const below = others.find((n) => { const r = n.getBoundingClientRect(); return mv.clientY < r.top + r.height / 2; });
      marks();
      target = below ? { id: below.dataset.id, after: false } : others.length ? { id: others[others.length - 1].dataset.id, after: true } : null;
      if (target) (below || others[others.length - 1]).classList.add(target.after ? 'drop-after' : 'drop-before');
    };
    const up = () => {
      wrap.removeEventListener('pointermove', move);
      wrap.removeEventListener('pointerup', up);
      wrap.removeEventListener('pointercancel', up);
      if (!started) { if (onName) { name.focus(); const n = name.value.length; name.setSelectionRange(n, n); } return; }
      dragging = null;
      marks();
      wrap.classList.remove('dragging');
      wrap.style.transform = '';
      if (target) moveEntry(e.id, target.id, target.after); else render();
    };
    wrap.addEventListener('pointermove', move);
    wrap.addEventListener('pointerup', up);
    wrap.addEventListener('pointercancel', up);
  });
}
function moveEntry(fromId, toId, after) {
  const ids = C.reorder(entries.filter((x) => x.tab === current).map((x) => x.id), fromId, toId, after);
  const changed = ids.map((id, i) => ({ ...byId(id), order: i })).filter((x) => byId(x.id).order !== x.order);
  if (changed.length) saveEntries(changed); else render();
}

// The token's picture; an empty circle with + when nothing is attached.
function renderAvatar(e, edit) {
  const t = tokenOf(e);
  const pick = picking === e.id;
  const b = el('button', { type: 'button', className: 'avatar' + (t ? '' : ' blank') + (pick ? ' picking' : ''), disabled: !edit && !t });
  if (t && t.url) b.append(el('img', { src: t.url, alt: '', draggable: false }));
  else if (!t && edit) b.innerHTML = svg('add');
  if (pick) b.title = 'Click a token on the map (Esc to cancel)';
  else if (t) b.title = liveTokens(e).length > 1 ? 'Select them on the map' : 'Select on map';
  else if (edit) b.title = 'Attach a token';
  b.addEventListener('click', () => {
    if (t) OBR.player.select(liveTokens(e), true);
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
    vis.append(e.hidden ? 'Stats hidden' : 'Stats shown');
    vis.title = e.hidden ? 'Players see H/B and AC: click to show everything' : 'Players see everything: click to hide the stats';
    vis.addEventListener('click', () => updateEntry(e, { hidden: !e.hidden }));
    actions.append(vis);
  }
  if (C.tokensOf(e).length) {
    const more = el('button', { type: 'button', className: 'btn' + (picking === e.id ? ' on' : ''), textContent: '+ Token' });
    more.title = 'Attach more tokens to this entry';
    more.addEventListener('click', () => startPick(e, true));
    const detach = el('button', { type: 'button', className: 'btn', textContent: 'Detach' });
    detach.addEventListener('click', () => updateEntry(e, (x) => C.withTokens(x, [])));
    actions.append(more, detach);
  }
  if (role === 'GM') {
    const move = el('select', { title: 'Move to tab' }, ...tabs.map((t) => el('option', { value: t.id, textContent: t.name, selected: t.id === e.tab })));
    move.addEventListener('change', () => updateEntry(e, { tab: move.value, hidden: C.isPlayerTab(tabById(move.value)) ? false : e.hidden }));
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
function loadScene(metadata) {
  sceneReady = true;
  ({ tabs, entries } = C.readState(metadata));
  render();
  refreshTokens().catch(() => {});
  const migrate = C.migrateTabsPatch(metadata);
  if (migrate) write(migrate);
}

if (!OBR.isAvailable) {
  document.documentElement.classList.add('page');
  $('standalone').hidden = false;
  $('manifest-url').textContent = new URL('manifest.json', location.href).href;
} else {
  OBR.onReady(async () => {
    try { current = localStorage.getItem(TAB_STORE) || C.PLAYERS_TAB; } catch {}
    role = await OBR.player.getRole();
    OBR.player.onChange((p) => {
      if (p.role !== role) { role = p.role; render(); }
      if (picking && p.selection && p.selection.length) finishPick(p.selection);
      else focusSelected(p.selection || []);
    });

    const start = async () => {
      loadScene(await OBR.scene.getMetadata());
      focusSelected((await OBR.player.getSelection()) || []);
    };
    OBR.scene.onMetadataChange(loadScene);
    OBR.scene.items.onChange(readTokens);
    OBR.scene.onReadyChange((ready) => { if (ready) start(); else { sceneReady = false; entries = []; tokens = new Map(); picking = null; render(); } });
    if (await OBR.scene.isReady()) start(); else render();
  });
}
