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
// Expanded entries: one at a time (it closes on a click anywhere else), plus any pinned ones.
let active = null;
const pinned = new Set();
const isExpanded = (id) => active === id || pinned.has(id);
function collapse(id) {
  pinned.delete(id);
  if (active === id) active = null;
}
let dirty = false; // a render was skipped while the user was typing
let sceneReady = false;
let picking = null; // entry waiting for a token click on the map
let tokens = new Map();
let selection = []; // what this player has selected on the map
let sceneMd = {}, roomMd = {};
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
  room: 'M14 6v15H3v-2h2V3h9v1h5v15h2v2h-4V6h-3zm-4 5v2h2v-2h-2z',
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
// Scene metadata by default; tabs saved to the room (and their entries) go to the room's metadata.
const byId = (id) => entries.find((e) => e.id === id);
const inRoom = (tabId) => !!(tabById(tabId) || {}).room;
async function write(patch, room = false) {
  if (!Object.keys(patch).length) return true;
  try {
    if (!room) { await OBR.scene.setMetadata(patch); return true; }
    await OBR.room.setMetadata(patch);
    roomMd = { ...roomMd, ...patch };
    const size = C.metadataSize(roomMd);
    if (size > C.ROOM_LIMIT * 0.75) OBR.notification.show(`Room storage is ${Math.round(size / 1024)} of 16 kB full`, 'WARNING');
    return true;
  } catch (err) {
    OBR.notification.show(`Chong's Tracker couldn't save: ${err.message || err}`, 'ERROR');
    return false;
  }
}
function saveEntries(list) {
  const scene = {}, room = {};
  for (const e of list) {
    const old = byId(e.id);
    const to = inRoom(e.tab);
    Object.assign(to ? room : scene, C.entryPatch(e));
    if (old && inRoom(old.tab) !== to) Object.assign(to ? scene : room, C.deletePatch(e.id));
    const i = entries.findIndex((x) => x.id === e.id);
    if (i >= 0) entries[i] = e; else entries.push(e);
  }
  entries.sort((a, b) => (a.order - b.order) || String(a.name).localeCompare(String(b.name)));
  render();
  return Promise.all([write(room, true), write(scene)]);
}
const saveEntry = (e) => saveEntries([e]);
// Merge a change into the LATEST copy of an entry (it may have changed since it was drawn).
function updateEntry(e, patch) {
  const cur = byId(e.id);
  if (!cur) return;
  return saveEntry({ ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) });
}
function deleteEntries(ids) {
  const scene = {}, room = {};
  ids.forEach((id) => Object.assign(inRoom((byId(id) || {}).tab) ? room : scene, C.deletePatch(id)));
  entries = entries.filter((e) => !ids.includes(e.id));
  render();
  return Promise.all([write(room, true), write(scene)]);
}
// Each tab is its own metadata key, so tabs changed by different people never overwrite each other.
function saveTab(tab) {
  const i = tabs.findIndex((t) => t.id === tab.id);
  tabs = i >= 0 ? tabs.map((t, k) => (k === i ? tab : t)) : [...tabs, tab];
  render();
  return write(C.tabPatch(tab), !!tab.room);
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
  write(C.tabDeletePatch(tab.id), !!tab.room);
  setTab(C.PLAYERS_TAB);
}

// Save a tab to the room (every scene in it) or back to this scene only.
// GMs: any tab, Players included. Players: the tabs players made.
const canRoom = (t) => !!t && (role === 'GM' || canManageTab(t));
async function toggleRoom(tab) {
  const toRoom = !tab.room;
  const ask = toRoom
    ? `Save "${tab.name}" to the room?\n\nIt will show in every scene in this room. Room storage is small (16 kB in all, shared with other extensions): keep room tabs to a few entries. Token links are per scene: attach tokens again in each scene.`
    : `Keep "${tab.name}" in this scene only?\n\nIt will be removed from every other scene in this room.`;
  if (!confirm(ask)) return;
  const moved = { ...tab, room: toRoom };
  if (!toRoom) delete moved.room;
  const { to, from } = C.moveTabPatches(moved, entries, toRoom);
  tabs = tabs.map((t) => (t.id === tab.id ? moved : t));
  render();
  if (await write(to, toRoom)) await write(from, !toRoom);
  else reload(); // nothing moved: back to what's saved
}

function runCommand(text) {
  const clear = C.parseClear(text);
  if (clear) return runClear(clear);
  const { rows, errors, note } = C.parseCommand(text);
  if (errors.length) OBR.notification.show(`Couldn't read: ${errors.join(' / ')}`, 'WARNING');
  const tab = tabById(current);
  if (note && tab) {
    const merged = C.addNote(tab.note, note);
    if (merged !== (tab.note || '')) saveTab({ ...tab, note: merged });
  }
  if (!rows.length) return !!note;
  const order = Math.max(0, ...entries.filter((e) => e.tab === current).map((e) => e.order + 1));
  const hidden = C.isPlayerTab(tabById(current)) ? false : undefined;
  saveEntries(C.rowsToEntries(rows, { tab: current, order, hidden }));
  return true;
}

// /clear: delete every entry in this tab and empty its general note (or, with a name, delete the
// entries whose names start with it; the note stays). GM only.
function runClear(clear) {
  if (role !== 'GM') { OBR.notification.show('Only the GM can clear entries', 'WARNING'); return false; }
  const hit = entries.filter((e) => e.tab === current && C.clearMatches(e, clear));
  const tab = tabById(current);
  const note = !clear.match && tab && !!tab.note;
  if (!hit.length && !note) { OBR.notification.show('Nothing to clear'); return true; }
  const what = [hit.length && `${hit.length} entr${hit.length === 1 ? 'y' : 'ies'}`, note && 'the note'].filter(Boolean).join(' and ');
  if (!confirm(`Delete ${what} from this tab?`)) return false;
  if (note) saveTab({ ...tab, note: '' });
  hit.forEach((e) => collapse(e.id));
  if (hit.length) deleteEntries(hit.map((e) => e.id));
  return true;
}

// Attaching works both ways: select token(s) then click an entry's empty circle, or click the
// circle then click a token on the map. Several tokens attach to this entry and the next
// unattached ones in this tab, in order: box-select 4 goblins, click "Goblin 1".
async function startPick(entry) {
  if (picking === entry.id) { picking = null; render(); return; }
  picking = entry.id;
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
  // Minion groups take every picked token; other entries take one each, filling the next
  // unattached entries in order.
  if (entry.group) {
    saveEntry(C.withTokens(entry, [...elsewhere(entry), ...free]));
    return;
  }
  const list = entries.filter((e) => e.tab === entry.tab);
  const start = list.indexOf(entry);
  const targets = [entry, ...list.slice(start + 1).filter((e) => !tokenOf(e) && C.canEdit(e, role, tabs))];
  saveEntries(free.slice(0, targets.length).map((token, i) => C.withTokens(targets[i], [...elsewhere(targets[i]), token])));
}
// A room entry keeps the tokens it has in other scenes (they aren't on this map).
const elsewhere = (e) => (inRoom(e.tab) ? C.tokensOf(e).filter((id) => !tokens.has(id)) : []);
// Clicking a selected token's picture takes the selected tokens off the entry.
function detachSelected(e) {
  updateEntry(e, (x) => C.withTokens(x, C.tokensOf(x).filter((id) => !selection.includes(id))));
}
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && picking) { picking = null; render(); } });

// Selecting tracked tokens on the map brings their entries to the top of the list (switching to
// their tab if needed) until the selection changes.
function focusSelected(sel) {
  selection = sel;
  const firstPick = (e) => Math.min(...C.tokensOf(e).map((t) => sel.indexOf(t)).filter((i) => i >= 0));
  const next = visibleEntries()
    .filter((e) => C.tokensOf(e).some((t) => sel.includes(t)))
    .sort((a, b) => firstPick(a) - firstPick(b))
    .map((e) => e.id);
  if (next.join() === focus.join()) return;
  focus = next;
  // Selecting a tracked token opens its entry; clicking anything else on the map closes it.
  if (active && !next.includes(active)) active = null;
  const opens = focus.map(byId).find((e) => C.canEdit(e, role, tabs));
  if (opens) active = opens.id;
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
  $('help').classList.toggle('gm', role === 'GM');
  if (!sceneReady) {
    $('tabs').replaceChildren();
    $('tab-add').replaceChildren();
    $('bar').replaceChildren();
    $('note').replaceChildren();
    setHelp(false);
    $('help-btn').hidden = true;
    renderList();
    return;
  }
  $('help-btn').hidden = false;
  if (!visibleTabs().some((t) => t.id === current)) current = C.PLAYERS_TAB;
  if (renamingTab && typing && a.closest('#tabs')) { // keep the name being typed; redraw when it's done
    dirty = true;
    a.addEventListener('blur', catchUp, { once: true });
  } else renderTabs();
  if (inBar) { // keep the add box (and what's typed in it); refresh its buttons once it's left
    dirty = true;
    a.addEventListener('blur', catchUp, { once: true });
  } else renderBar();
  renderNote();
  renderList();
}
let pointerDown = false;
function catchUp() { setTimeout(() => { if (dirty && !pointerDown) render(); }, 0); }
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
document.addEventListener('pointerup', () => { pointerDown = false; catchUp(); }, true);
// A press that ends outside the panel never sends pointerup here: don't stay stuck waiting for it.
for (const ev of ['pointercancel', 'blur']) window.addEventListener(ev, () => { pointerDown = false; catchUp(); });
document.addEventListener('focusout', catchUp);
// A click anywhere outside the open entry closes it (pinned ones stay). Redrawn after the click
// lands, so the button pressed still works. Clicking the map takes focus from the panel.
document.addEventListener('pointerdown', (ev) => {
  if (!active || ev.target.closest(`.entry[data-id="${active}"]`)) return;
  active = null;
  dirty = true;
}, true);
window.addEventListener('blur', () => { if (active) { active = null; dirty = true; catchUp(); } });

// Tab strip: fades at an edge with more tabs past it, scrolls sideways with the wheel, and brings
// the open tab into view when it changes.
let shownTab = null;
function tabFades() {
  const nav = $('tabs');
  nav.classList.toggle('fade-l', nav.scrollLeft > 1);
  nav.classList.toggle('fade-r', nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
}
$('tabs').addEventListener('scroll', tabFades, { passive: true });
$('tabs').addEventListener('wheel', (ev) => {
  const nav = $('tabs');
  if (nav.scrollWidth <= nav.clientWidth || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return;
  ev.preventDefault();
  nav.scrollLeft += ev.deltaY;
}, { passive: false });
window.addEventListener('resize', tabFades);

function renderTabs() {
  const nav = $('tabs');
  const x = nav.scrollLeft;
  nav.replaceChildren();
  const list = visibleTabs();
  nav.classList.toggle('many', list.length >= 5);
  for (const t of list) {
    const active = t.id === current;
    const b = el('button', { type: 'button', className: 'tab' + (active ? ' active' : '') });
    b.dataset.tab = t.id;
    if (t.room) b.append(el('span', { className: 'in-room', title: 'Saved to the room (every scene)', innerHTML: svg('room') }));
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
      // After focus has moved: saving redraws, and must not rebuild the box being clicked into.
      inp.addEventListener('blur', () => setTimeout(done, 0));
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
  nav.scrollLeft = x;
  if (shownTab !== current) {
    shownTab = current;
    const b = nav.querySelector('.tab.active');
    if (b) b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
  tabFades();
  $('tab-add').replaceChildren(iconButton('add', 'New tab', addTab));
}

// The help sheet: the ⓘ button in the lower-right corner opens it over the whole panel.
function setHelp(on) {
  helpOpen = on;
  $('help').hidden = !on;
  const b = $('help-btn');
  b.innerHTML = svg(on ? 'close' : 'info');
  b.title = on ? 'Close help' : 'Help';
  b.setAttribute('aria-label', b.title);
  b.classList.toggle('on', on);
}
$('help-btn').addEventListener('click', () => setHelp(!helpOpen));
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && helpOpen) setHelp(false); });

function renderBar() {
  const bar = $('bar');
  bar.replaceChildren();
  const canAdd = role === 'GM' || C.isPlayerTab(tabById(current));
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
  bar.append(box);
  if (role === 'GM' && current !== C.PLAYERS_TAB) {
    const inTab = entries.filter((e) => e.tab === current);
    const anyHidden = inTab.some((e) => e.hidden);
    bar.append(iconButton(anyHidden ? 'eyeOff' : 'eye', anyHidden ? 'Show all stats to players' : 'Hide all stats from players',
      () => saveEntries(inTab.map((e) => ({ ...e, hidden: !anyHidden }))), !anyHidden));
  }
  const tab = tabById(current);
  if (canRoom(tab)) {
    bar.append(iconButton('room', tab.room ? 'Saved to the room (every scene): click to keep in this scene only' : 'Save to the room (every scene)',
      () => toggleRoom(tab), !!tab.room));
  }
}

// A text box that grows with its text (up to a point) and saves when you leave it.
function noteBox(value, placeholder, onCommit) {
  const box = el('textarea', { className: 'note', rows: 1, value: value || '', placeholder, spellcheck: false });
  const grow = () => { box.style.height = 'auto'; box.style.height = Math.min(240, Math.max(32, box.scrollHeight + 2)) + 'px'; };
  box.addEventListener('input', grow);
  box.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { box.value = value || ''; box.blur(); } });
  box.addEventListener('change', () => onCommit(box.value.trim()));
  requestAnimationFrame(grow);
  return box;
}

// A note shown as text: click it to edit (the edit box comes back with the raw text; leaving it shows the text again).
function noteView(value, placeholder, onCommit) {
  if (!value) return noteBox(value, placeholder, onCommit);
  const view = el('div', { className: 'note-view', tabIndex: 0 });
  String(value).split('\n').forEach((line, i) => {
    if (i) view.append(el('br'));
    view.append(line);
  });
  const edit = () => {
    const box = noteBox(value, placeholder, onCommit);
    view.replaceWith(box);
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
    // Leaving the box without a change shows the text again (a change redraws anyway)
    box.addEventListener('blur', () => { if (box.isConnected && box.value.trim() === String(value).trim()) box.replaceWith(noteView(value, placeholder, onCommit)); });
  };
  view.addEventListener('click', edit);
  view.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); edit(); } });
  return view;
}

// The tab's general note, at the top: for whoever can add to the tab (GM tabs: GM only).
function renderNote() {
  const wrap = $('note');
  const tab = tabById(current);
  const canAdd = role === 'GM' || C.isPlayerTab(tab);
  if (!tab || !canAdd) { wrap.replaceChildren(); return; }
  wrap.replaceChildren(noteView(tab.note, 'Note', (text) => {
    const cur = tabById(tab.id);
    if (cur && text !== (cur.note || '')) saveTab({ ...cur, note: text });
  }));
}

function renderList() {
  const list = $('list');
  let shown = visibleEntries().filter((e) => e.tab === current);
  const first = focus.map(byId).filter((e) => shown.includes(e));
  shown = [...first, ...shown.filter((e) => !first.includes(e))];
  list.replaceChildren(...shown.map(renderEntry));
  list.querySelectorAll('.name').forEach(fadeLong);
  const empty = $('empty');
  empty.hidden = shown.length > 0;
  empty.textContent = sceneReady ? 'No entries' : 'No scene';
}

// A name too long for its row fades out at the end instead of being cut off (style.css .name.long).
function fadeLong(name) {
  name.classList.toggle('long', name.scrollWidth > name.clientWidth + 1);
}
addEventListener('resize', () => document.querySelectorAll('.row .name').forEach(fadeLong));

function renderEntry(e) {
  const edit = C.canEdit(e, role, tabs);
  const mask = C.masked(e, role);
  const isOpen = isExpanded(e.id) && edit;
  const wrap = el('div', { className: 'entry' + (isOpen ? ' open' : '') + (e.hidden && role === 'GM' ? ' hidden-entry' : '') + (focus.includes(e.id) ? ' focus' : '') });
  wrap.dataset.id = e.id;
  const row = el('div', { className: 'row' });

  row.append(renderAvatar(e, edit));
  const name = el('input', { className: 'name', value: e.name, disabled: !edit, spellcheck: false });
  name.addEventListener('change', () => updateEntry(e, { name: name.value.trim() || e.name }));
  name.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') name.blur(); });
  name.addEventListener('input', () => fadeLong(name));
  name.addEventListener('blur', () => { name.scrollLeft = 0; fadeLong(name); });
  row.append(name);
  const many = liveTokens(e).length;
  if (many > 1) row.append(el('span', { className: 'count', title: `${many} tokens`, textContent: `×${many}` }));

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

  if (isOpen) {
    const pin = pinned.has(e.id);
    row.append(iconButton('pin', pin ? 'Unpin' : 'Pin open', () => {
      if (pin) { pinned.delete(e.id); active = e.id; } else { pinned.add(e.id); if (active === e.id) active = null; }
      render();
    }, pin));
  }
  if (edit) {
    row.append(iconButton('more', isOpen ? 'Close' : 'More', () => {
      if (isOpen) collapse(e.id); else active = e.id;
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
    const marks = () => document.querySelectorAll('.drop-before, .drop-after, .drop-tab').forEach((n) => n.classList.remove('drop-before', 'drop-after', 'drop-tab'));
    const move = (mv) => {
      if (!started) {
        if (Math.abs(mv.clientY - y0) < 6) return;
        started = true;
        dragging = e.id;
        try { wrap.setPointerCapture(ev.pointerId); } catch {}
        wrap.classList.add('dragging');
      }
      wrap.style.transform = `translateY(${mv.clientY - y0}px)`;
      // Over another tab: drop moves the entry there. Near the strip's ends it scrolls.
      const nav = $('tabs'), r = nav.getBoundingClientRect();
      if (mv.clientY >= r.top && mv.clientY <= r.bottom) {
        if (mv.clientX < r.left + 28) nav.scrollLeft -= 12;
        else if (mv.clientX > r.right - 28) nav.scrollLeft += 12;
      }
      const tab = tabUnder(mv.clientX, mv.clientY);
      if (tab) {
        marks();
        tab.classList.add('drop-tab');
        target = { tab: tab.dataset.tab };
        return;
      }
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
      if (target && target.tab) moveToTab(e.id, target.tab);
      else if (target) moveEntry(e.id, target.id, target.after);
      else render();
    };
    wrap.addEventListener('pointermove', move);
    wrap.addEventListener('pointerup', up);
    wrap.addEventListener('pointercancel', up);
  });
}
// The tab button under the pointer that this entry can be dropped on: not the open tab, and for
// players only players' tabs.
function tabUnder(x, y) {
  const strip = $('tabs').getBoundingClientRect();
  if (x < strip.left || x > strip.right) return null; // scrolled out of sight
  for (const b of document.querySelectorAll('#tabs .tab[data-tab]')) {
    const r = b.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    const t = tabById(b.dataset.tab);
    return t && t.id !== current && (role === 'GM' || C.isPlayerTab(t)) ? b : null;
  }
  return null;
}
function moveToTab(id, tabId) {
  const e = byId(id), tab = tabById(tabId);
  if (!e || !tab) { render(); return; }
  const order = Math.max(0, ...entries.filter((x) => x.tab === tabId).map((x) => x.order + 1));
  saveEntry({ ...e, tab: tabId, order, hidden: C.isPlayerTab(tab) ? false : e.hidden });
}
function moveEntry(fromId, toId, after) {
  const ids = C.reorder(entries.filter((x) => x.tab === current).map((x) => x.id), fromId, toId, after);
  const changed = ids.map((id, i) => ({ ...byId(id), order: i })).filter((x) => byId(x.id).order !== x.order);
  if (changed.length) saveEntries(changed); else render();
}

// The token's picture; an empty circle with + when nothing is attached. Click the picture to select
// the token on the map; while it's selected an × shows over it, and clicking again detaches it.
function renderAvatar(e, edit) {
  const t = tokenOf(e);
  const pick = picking === e.id;
  const armed = !!t && edit && focus.includes(e.id);
  const b = el('button', { type: 'button', className: 'avatar' + (t ? '' : ' blank') + (pick ? ' picking' : '') + (armed ? ' armed' : ''), disabled: !edit && !t });
  if (t && t.url) b.append(el('img', { src: t.url, alt: '', draggable: false }));
  else if (!t && edit) b.innerHTML = svg('add');
  if (armed) b.append(el('span', { className: 'unhook', innerHTML: svg('close') }));
  if (pick) b.title = 'Click a token on the map (Esc to cancel)';
  else if (armed) b.title = 'Detach the selected token' + (liveTokens(e).filter((id) => selection.includes(id)).length > 1 ? 's' : '');
  else if (t) b.title = liveTokens(e).length > 1 ? 'Select them on the map' : 'Select on map';
  else if (edit) b.title = 'Attach a token';
  b.addEventListener('click', () => {
    if (armed) detachSelected(e);
    else if (t) OBR.player.select(liveTokens(e), true);
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
  // Not a <label>: the note is a text view until clicked, not a field.
  const note = noteView(e.note, '', (text) => { if (text !== (e.note || '')) updateEntry(e, { note: text }); });
  const caption = el('span', { textContent: 'Note' });
  caption.addEventListener('click', () => {
    if (!note.isConnected) return;
    if (note.tagName === 'TEXTAREA') note.focus(); else note.click();
  });
  more.append(el('div', { className: 'field' }, caption, note));

  const actions = el('div', { className: 'actions' });
  if (role === 'GM') {
    const vis = el('button', { type: 'button', className: 'btn' + (e.hidden ? '' : ' on'), innerHTML: svg(e.hidden ? 'eyeOff' : 'eye') });
    vis.append(e.hidden ? 'Stats hidden' : 'Stats shown');
    vis.title = e.hidden ? 'Players see H/B and AC: click to show everything' : 'Players see everything: click to hide the stats';
    vis.addEventListener('click', () => updateEntry(e, { hidden: !e.hidden }));
    actions.append(vis);
  }
  actions.append(el('span', { className: 'grow' }));
  const del = el('button', { type: 'button', className: 'btn danger', textContent: 'Delete' });
  del.addEventListener('click', () => { collapse(e.id); deleteEntries([e.id]); });
  actions.append(del);
  more.append(actions);
  return more;
}

// --- Owlbear wiring ---------------------------------------------------------------------
function reload() {
  if (!sceneReady) return;
  ({ tabs, entries } = C.readState(sceneMd, roomMd));
  render();
  refreshTokens().catch(() => {});
}
function loadScene(metadata) {
  sceneReady = true;
  sceneMd = metadata;
  reload();
  const migrate = C.migrateTabsPatch(metadata);
  if (migrate) write(migrate);
}

if (!OBR.isAvailable) {
  document.documentElement.classList.add('page');
  $('standalone').hidden = false;
  $('manifest-url').textContent = new URL('manifest.json', location.href).href;
  // The extension's own page doubles as its guide: the help sheet, all of it, in the page.
  const help = $('help');
  help.classList.add('gm', 'inline');
  help.hidden = false;
  $('standalone').append(help);
} else {
  OBR.onReady(async () => {
    try { current = localStorage.getItem(TAB_STORE) || C.PLAYERS_TAB; } catch {}
    role = await OBR.player.getRole();
    OBR.player.onChange((p) => {
      if (p.role !== role) { role = p.role; render(); }
      if (picking && p.selection && p.selection.length) finishPick(p.selection);
      else focusSelected(p.selection || []);
    });

    roomMd = await OBR.room.getMetadata();
    OBR.room.onMetadataChange((md) => { roomMd = md; reload(); });
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
