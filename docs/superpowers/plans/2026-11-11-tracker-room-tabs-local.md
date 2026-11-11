# Room Tabs Kept by the GM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chong's Tracker's room tabs live in the GM's browser (localStorage) and reach players by OBR broadcast, instead of Owlbear's room metadata.

**Architecture:** The local copy keeps the exact shape of today's room metadata (`com.chongkit.tracker/t/<id>` and `/e/<id>` keys), so `readState`, every patch builder and the panel's logic stay as they are; only where the "room" object comes from and goes to changes. Pure helpers go in `core.js` (tested); a new browser script `room.js` (global `ChongRoom`) owns storage, broadcasts, requests, edits and the one-time move; `app.js` and `background.js` use it in place of `OBR.room`.

**Tech Stack:** Plain JS (browser globals + CommonJS for `core.js`), `@owlbear-rodeo/sdk` bundled in `vendor/obr-sdk.js` (`OBR.broadcast.sendMessage(channel, data, { destination: 'REMOTE' | 'LOCAL' | 'ALL' })`, `OBR.broadcast.onMessage(channel, (event) => event.data)`, `OBR.room.id`), `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-11-tracker-room-tabs-local-design.md`

## Global Constraints

- System-agnostic, Owlbear's look, no `nimble.css` (CLAUDE.md "Chong's Tracker").
- Plain HTML + vanilla JS, no build step; the SDK file is not edited.
- Normal (scene) tabs are untouched: scene metadata, one key per entry and per tab.
- After the one-time move, nothing of ours is written to `OBR.room` metadata.
- localStorage key for the copy: `com.chongkit.tracker/room/<OBR.room.id>`; every read/write in `try/catch`.
- Broadcast channel `com.chongkit.tracker/room`. Messages: `{ type: 'list', v, md }`, `{ type: 'request' }`, `{ type: 'edit', patch }`, pieces `{ type: 'piece', id, part, of, chunk }` with `chunk` ≤ 8000 characters.
- Players: room tabs read-only when no list has been heard for 30 s (`OFFLINE_AFTER = 30000`); a player re-asks every 20 s (`ASK_EVERY = 20000`) while not heard.
- Only `background.js` answers `request` and applies `edit` (it always runs); the panel never does, so a GM browser answers once.
- Bump the version to **1.13.0** in `manifest.json` and every `?v=` in `index.html` and `background.html` (CLAUDE.md tracker rule 8).
- `npm test` passes before every commit; commit straight to `main`; pull (`git pull --rebase origin main`) before pushing; commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**User decisions (already made):**
- Only room tabs move off room metadata (normal tabs stay in scene metadata).
- Players' room tabs are read-only while the GM is offline; no queued edits.
- Approach: GM's browser holds the list, broadcasts share it (whole list per change, not deltas).
- Export / Import room tabs in the GM's help is included (spec "Backup").
- Spec approved ("start building").

**Rulings for things the spec leaves open:**
- Entries have no edit timestamps, so "newer wins" for merges is: move-over keeps the GM's local key when both have it (the local copy is the newer one after a move); import overwrites by key (the file wins).
- A player's edit is shown at once on their screen (applied to their copy without changing `v`), then replaced by the GM's next `list`.

---

## File map

| File | Change |
|---|---|
| `chongs-tracker/core.js` | + room helpers (constants, `applyRoomPatch`, `readRoomCopy`, `newerList`, `splitList`, `joinPieces`, `roomEditable`, `moveRoomPatch`, `roomFile`, `readRoomFile`); `ROOM_LIMIT` / `metadataSize` removed when unused |
| `chongs-tracker/tests/core.test.js` | tests for the above |
| `chongs-tracker/room.js` (new) | `window.ChongRoom(OBR, { answer, onChange })` |
| `chongs-tracker/app.js` | room reads/writes via `room`, read-only rule, no 16 kB warning, export/import |
| `chongs-tracker/background.js` | badges and Track via `room`; it answers |
| `chongs-tracker/index.html`, `background.html` | `room.js` script; `?v=1.13.0`; export/import buttons in help |
| `chongs-tracker/manifest.json` | `1.13.0` |
| `CLAUDE.md`, `README.md`, `chongs-tracker/TRACKER.md` | docs |

---

### Task 1: Room helpers in core.js

**Goal:** Pure, tested helpers for the room copy, messages, pieces, the read-only rule, the move-over and the backup file.

**Files:**
- Modify: `chongs-tracker/core.js` (new section after `metadataSize`; exports)
- Test: `chongs-tracker/tests/core.test.js`

**Acceptance Criteria:**
- [ ] `applyRoomPatch(md, patch)` returns a new object: keys starting with `KEYS.tabPrefix` / `KEYS.entryPrefix` set to the patch value, `null` deletes; other keys in the patch are ignored; `md` is not mutated
- [ ] `readRoomCopy(text)` returns `{ v, md }` from saved JSON, keeping only room keys with object values; `{ v: 0, md: {} }` for null / broken / wrong shape
- [ ] `newerList(have, got)` is true iff `got` is a list with a numeric `v` greater than `have.v` (or `have` is null)
- [ ] `splitList(list, id)` gives pieces `{ type: 'piece', id, part, of, chunk }` with `chunk.length ≤ ROOM_PIECE` (8000) and `joinPieces(buf, piece, now)` rebuilds the list once all parts arrived (any order), returns `null` before, drops partial sets older than 10 s
- [ ] `roomEditable(lastHeard, now, role)` is true for `'GM'`; for players iff `lastHeard > 0 && now - lastHeard < OFFLINE_AFTER`
- [ ] `moveRoomPatch(roomMd, localMd)` returns `null` when `roomMd` has no room keys, else `{ md, deletes }`: `md` = local plus room keys not already local; `deletes` sets every room key found to `null`
- [ ] `roomFile(list)` / `readRoomFile(text)` round-trip `md`; `readRoomFile` returns `null` for anything that isn't `{ chongTracker: 'room', md: {…} }`

**Verify:** `node --test "chongs-tracker/tests/*.test.js"` → `ℹ fail 0`

**Steps:**

- [ ] **Step 1: Failing tests** (append to `tests/core.test.js`)

```js
test('room copy: patches, saved copy, newer lists', () => {
  const t = C.KEYS.tabPrefix, e = C.KEYS.entryPrefix;
  const md = { [t + 'a']: { name: 'A' }, [e + '1']: { id: '1', tab: 'a' } };
  const out = C.applyRoomPatch(md, { [e + '1']: null, [e + '2']: { id: '2', tab: 'a' }, other: 5 });
  assert.deepStrictEqual(Object.keys(out).sort(), [e + '2', t + 'a'].sort());
  assert.ok(md[e + '1'], 'not mutated');
  assert.deepStrictEqual(C.readRoomCopy(JSON.stringify({ v: 3, md: { [t + 'a']: { name: 'A' }, junk: 1, [e + 'x']: 'no' } })), { v: 3, md: { [t + 'a']: { name: 'A' } } });
  for (const bad of [null, '', '{', '[]', '{"v":"x","md":{}}', '{"v":1}']) assert.deepStrictEqual(C.readRoomCopy(bad), { v: 0, md: {} }, String(bad));
  assert.ok(C.newerList(null, { v: 1, md: {} }));
  assert.ok(C.newerList({ v: 1 }, { v: 2, md: {} }));
  assert.ok(!C.newerList({ v: 2 }, { v: 2, md: {} }));
  assert.ok(!C.newerList({ v: 2 }, { v: 'x', md: {} }));
});

test('room pieces: split, join in any order, drop stale', () => {
  const md = {};
  for (let i = 0; i < 400; i++) md[C.KEYS.entryPrefix + i] = { id: String(i), name: 'Goblin number ' + i, note: 'x'.repeat(40) };
  const list = { type: 'list', v: 7, md };
  const pieces = C.splitList(list, 'p1');
  assert.ok(pieces.length > 1);
  for (const p of pieces) assert.ok(p.chunk.length <= C.ROOM_PIECE && p.of === pieces.length && p.type === 'piece');
  const buf = new Map();
  const order = pieces.slice().reverse();
  let got = null;
  order.forEach((p, i) => { const r = C.joinPieces(buf, p, 1000); if (i < order.length - 1) assert.strictEqual(r, null); else got = r; });
  assert.deepStrictEqual(got, list);
  const buf2 = new Map();
  C.joinPieces(buf2, pieces[0], 0);
  assert.strictEqual(C.joinPieces(buf2, pieces[1], 20000), null, 'old partial set dropped');
  assert.strictEqual(C.splitList({ type: 'list', v: 1, md: {} }, 'p2').length, 1);
});

test('room: read-only while the GM is away; move-over; backup file', () => {
  assert.ok(C.roomEditable(0, 99999, 'GM'));
  assert.ok(!C.roomEditable(0, 1000, 'PLAYER'));
  assert.ok(C.roomEditable(1000, 1000 + C.OFFLINE_AFTER - 1, 'PLAYER'));
  assert.ok(!C.roomEditable(1000, 1000 + C.OFFLINE_AFTER, 'PLAYER'));
  const t = C.KEYS.tabPrefix, e = C.KEYS.entryPrefix;
  assert.strictEqual(C.moveRoomPatch({ other: 1 }, {}), null);
  const room = { [t + 'a']: { name: 'Room A' }, [e + '1']: { id: '1' }, otherExt: 2 };
  const local = { [t + 'a']: { name: 'Local A' } };
  const m = C.moveRoomPatch(room, local);
  assert.deepStrictEqual(m.md, { [t + 'a']: { name: 'Local A' }, [e + '1']: { id: '1' } });
  assert.deepStrictEqual(m.deletes, { [t + 'a']: null, [e + '1']: null });
  const file = C.roomFile({ v: 4, md: room });
  assert.deepStrictEqual(C.readRoomFile(file), { [t + 'a']: { name: 'Room A' }, [e + '1']: { id: '1' } });
  for (const bad of ['', '{', '{"md":{}}', '{"chongTracker":"room"}', '[]']) assert.strictEqual(C.readRoomFile(bad), null, bad);
});
```

- [ ] **Step 2:** `node --test "chongs-tracker/tests/*.test.js"` → FAIL (`C.applyRoomPatch is not a function`).

- [ ] **Step 3: Implement** in `core.js` after `metadataSize`:

```js
  // --- Room tabs, kept by the GM -------------------------------------------------------
  // Room tabs (and their entries) live in the GM's browser, in the same key/value shape as room
  // metadata (KEYS.tabPrefix / KEYS.entryPrefix keys), and reach players by OBR broadcast.
  const ROOM_CHANNEL = `${NS}/room`;
  const ROOM_STORE = `${NS}/room/`; // + the room's id, in localStorage
  const ROOM_PIECE = 8000; // characters per broadcast piece
  const OFFLINE_AFTER = 30000; // players: no list for this long = the GM is away (read-only)
  const ASK_EVERY = 20000; // players re-ask this often while the GM is away
  const isRoomKey = (k) => k.startsWith(KEYS.tabPrefix) || k.startsWith(KEYS.entryPrefix);
  const roomKeys = (md) => Object.fromEntries(Object.entries(md || {}).filter(([k, v]) => isRoomKey(k) && v && typeof v === 'object' && !Array.isArray(v)));
  function applyRoomPatch(md, patch) {
    const out = { ...md };
    for (const [k, v] of Object.entries(patch || {})) {
      if (!isRoomKey(k)) continue;
      if (v == null) delete out[k]; else out[k] = v;
    }
    return out;
  }
  function readRoomCopy(text) {
    try {
      const o = JSON.parse(text);
      if (o && typeof o.v === 'number' && o.md && typeof o.md === 'object' && !Array.isArray(o.md)) return { v: o.v, md: roomKeys(o.md) };
    } catch {}
    return { v: 0, md: {} };
  }
  const newerList = (have, got) => !!got && typeof got.v === 'number' && got.v > (have ? have.v : -1);
  function splitList(list, id) {
    const s = JSON.stringify(list), of = Math.max(1, Math.ceil(s.length / ROOM_PIECE)), out = [];
    for (let part = 0; part < of; part++) out.push({ type: 'piece', id, part, of, chunk: s.slice(part * ROOM_PIECE, (part + 1) * ROOM_PIECE) });
    return out;
  }
  // buf: a Map kept by the caller. Returns the whole list once every piece of it has arrived.
  function joinPieces(buf, p, now) {
    for (const [id, b] of buf) if (now - b.at > 10000) buf.delete(id);
    const b = buf.get(p.id) || { at: now, parts: [] };
    b.parts[p.part] = p.chunk;
    buf.set(p.id, b);
    if (b.parts.filter((x) => x != null).length < p.of) return null;
    buf.delete(p.id);
    try { return JSON.parse(b.parts.join('')); } catch { return null; }
  }
  const roomEditable = (lastHeard, now, role) => role === 'GM' || (lastHeard > 0 && now - lastHeard < OFFLINE_AFTER);
  // Moving old room metadata into the GM's copy: keys already in the copy stay as they are.
  function moveRoomPatch(roomMd, localMd) {
    const found = roomKeys(roomMd);
    if (!Object.keys(found).length) return null;
    return { md: { ...found, ...localMd }, deletes: Object.fromEntries(Object.keys(found).map((k) => [k, null])) };
  }
  const roomFile = (list) => JSON.stringify({ chongTracker: 'room', v: list.v, md: list.md }, null, 1);
  function readRoomFile(text) {
    try {
      const o = JSON.parse(text);
      if (o && o.chongTracker === 'room' && o.md && typeof o.md === 'object' && !Array.isArray(o.md)) return roomKeys(o.md);
    } catch {}
    return null;
  }
```

Add to `api`: `ROOM_CHANNEL, ROOM_STORE, ROOM_PIECE, OFFLINE_AFTER, ASK_EVERY, applyRoomPatch, readRoomCopy, newerList, splitList, joinPieces, roomEditable, moveRoomPatch, roomFile, readRoomFile,`. (Leave `ROOM_LIMIT` / `metadataSize` until Task 3 removes their last use; then delete them and their test if no other caller remains.)

- [ ] **Step 4:** `node --test "chongs-tracker/tests/*.test.js"` → `ℹ fail 0`; `npm test` → fail 0.
- [ ] **Step 5: Commit** — `git add chongs-tracker/core.js chongs-tracker/tests/core.test.js && git commit -m "Chong's Tracker: room copy helpers (pure, tested)"`

---

### Task 2: room.js — the shared room copy

**Goal:** One browser script used by the panel and the background: holds the room copy, saves it, sends and receives broadcasts, answers (background only), applies players' edits (GM only), moves old room metadata once.

**Files:**
- Create: `chongs-tracker/room.js`
- Create: `chongs-tracker/tests/room.test.js`
- Modify: `chongs-tracker/index.html`, `chongs-tracker/background.html` (script tag after `core.js`)

**Acceptance Criteria:**
- [ ] `ChongRoom(OBR, { answer, onChange, storage })` (storage defaults to `window.localStorage`; tests pass their own) returns `{ ready, md, write, editable, importMd, list }` (see code); `await ready` resolves after the role, room id and saved copy are loaded
- [ ] `md()` returns the copy's keys over any of our keys still in Owlbear's room metadata (old data shows until the GM moves it)
- [ ] GM `write(patch)`: applies, `v + 1`, saves to localStorage, broadcasts the list to `REMOTE` (in pieces), calls `onChange`; returns `true`
- [ ] Player `write(patch)`: when `editable()`, sends `{ type: 'edit', patch }` to `REMOTE`, applies it to the shown copy without changing `v`, returns `true`; else shows the warning notification and returns `false`
- [ ] With `answer: true`: answers `request` with the list (GM only) and applies `edit` (GM only); on a GM, moves old room metadata once (`moveRoomPatch` → save → broadcast → `OBR.room.setMetadata(deletes)`)
- [ ] Players send `request` at start and every `ASK_EVERY` ms while not `editable()`; a received newer `list` (whole or rebuilt from pieces) is saved, `heard` is stored in localStorage (`<store key>/heard`) and `onChange` runs
- [ ] The other page of the same browser follows through the `storage` event (copy and `heard`)

**Verify:** `node --test "chongs-tracker/tests/*.test.js"` → `ℹ fail 0` (includes `room.test.js`)

**Steps:**

- [ ] **Step 1: Create `chongs-tracker/room.js`**

```js
// Chong's Tracker: room tabs, kept by the GM. The GM's browser holds them (localStorage, the same
// key/value shape as room metadata); players get them by OBR broadcast and keep the last copy.
// Only the background page answers requests and applies players' edits, so each GM answers once.
// Browser global `ChongRoom` (a plain script, before the module that uses it).
(function () {
  const C = window.ChongCore;

  window.ChongRoom = function (OBR, { answer = false, onChange = () => {}, storage = window.localStorage } = {}) {
    let role = 'PLAYER', key = null, list = { v: 0, md: {} }, legacy = {}, heard = 0;
    const buf = new Map();
    const load = () => { try { list = C.readRoomCopy(storage.getItem(key)); heard = Number(storage.getItem(key + '/heard')) || 0; } catch {} };
    const save = () => { try { storage.setItem(key, JSON.stringify(list)); } catch {} };
    const send = (data) => OBR.broadcast.sendMessage(C.ROOM_CHANNEL, data, { destination: 'REMOTE' }).catch(() => {});
    const sendList = () => C.splitList({ type: 'list', v: list.v, md: list.md }, C.uid()).forEach(send);
    const editable = () => C.roomEditable(heard, Date.now(), role);
    const md = () => ({ ...legacy, ...list.md });

    function apply(patch) { // GM: the real copy changes
      list = { v: list.v + 1, md: C.applyRoomPatch(list.md, patch) };
      save();
      sendList();
      onChange();
    }
    function got(l) { // a list from a GM
      if (!C.newerList(list, l)) { if (role !== 'GM') { heard = Date.now(); try { storage.setItem(key + '/heard', String(heard)); } catch {} } return; }
      list = { v: l.v, md: C.readRoomCopy(JSON.stringify(l)).md };
      if (role !== 'GM') { heard = Date.now(); try { storage.setItem(key + '/heard', String(heard)); } catch {} }
      save();
      onChange();
    }
    function onMessage(data) {
      if (!data || typeof data !== 'object') return;
      if (data.type === 'piece') { const l = C.joinPieces(buf, data, Date.now()); if (l && l.type === 'list') got(l); return; }
      if (data.type === 'list') return got(data);
      if (!answer || role !== 'GM') return;
      if (data.type === 'request') sendList();
      if (data.type === 'edit') apply(data.patch);
    }
    async function moveOld() { // once per room: our old keys in room metadata move into the GM's copy
      const m = C.moveRoomPatch(await OBR.room.getMetadata(), list.md);
      if (!m) return;
      list = { v: list.v + 1, md: m.md };
      save();
      sendList();
      await OBR.room.setMetadata(m.deletes);
      onChange();
    }
    async function write(patch) {
      if (!Object.keys(patch || {}).length) return true;
      if (role === 'GM') { apply(patch); return true; }
      if (!editable()) { OBR.notification.show('Room tabs are read-only until the GM is back', 'WARNING'); return false; }
      send({ type: 'edit', patch });
      list = { v: list.v, md: C.applyRoomPatch(list.md, patch) }; // shown now; the GM's next list replaces it
      onChange();
      return true;
    }
    function importMd(md2) { if (role === 'GM') apply(Object.fromEntries(Object.entries(md2))); }

    const ready = (async () => {
      role = await OBR.player.getRole();
      key = C.ROOM_STORE + OBR.room.id;
      load();
      legacy = Object.fromEntries(Object.entries(await OBR.room.getMetadata()).filter(([k]) => k.startsWith(C.KEYS.tabPrefix) || k.startsWith(C.KEYS.entryPrefix)));
      OBR.room.onMetadataChange((m) => { legacy = Object.fromEntries(Object.entries(m).filter(([k]) => k.startsWith(C.KEYS.tabPrefix) || k.startsWith(C.KEYS.entryPrefix))); onChange(); });
      OBR.player.onChange((p) => { if (p.role !== role) { role = p.role; onChange(); } });
      OBR.broadcast.onMessage(C.ROOM_CHANNEL, (ev) => onMessage(ev.data));
      if (storage === window.localStorage) window.addEventListener('storage', (ev) => { if (ev.key === key || ev.key === key + '/heard') { load(); onChange(); } });
      if (role === 'GM' && answer) await moveOld().catch(() => {});
      if (role === 'GM' && answer) sendList();
      if (role !== 'GM') send({ type: 'request' });
      setInterval(() => { if (role !== 'GM' && !editable()) send({ type: 'request' }); onChange(); }, C.ASK_EVERY);
    })();

    return { ready, md, write, editable, importMd, list: () => list, role: () => role };
  };
})();
```

Note `importMd` passes the file's keys as a patch, so the file wins per key (ruling). The `setInterval` also calls `onChange` so a player's read-only state is redrawn when the GM goes quiet.

- [ ] **Step 1b: Node check — `chongs-tracker/tests/room.test.js`** (runs under `node --test "chongs-tracker/tests/*.test.js"`, so `npm test` covers it; `tests/` is already off the published site)

```js
// room.js against a fake Owlbear: a GM page and a player page on one in-memory broadcast bus.
const test = require('node:test');
const assert = require('node:assert');
const C = require('../core.js');

global.window = { ChongCore: C, localStorage: null, addEventListener() {} };
require('../room.js');

const tick = () => new Promise((r) => setImmediate(r));
function memStore() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; }
function world() {
  const subs = [], roomMd = { metadata: {}, subs: [] };
  function obr(role) {
    const me = { role, notes: [] };
    me.OBR = {
      player: { getRole: async () => role, onChange() {} },
      room: {
        id: 'room1',
        getMetadata: async () => ({ ...roomMd.metadata }),
        setMetadata: async (p) => { for (const [k, v] of Object.entries(p)) { if (v == null) delete roomMd.metadata[k]; else roomMd.metadata[k] = v; } roomMd.subs.forEach((f) => f({ ...roomMd.metadata })); },
        onMetadataChange: (f) => roomMd.subs.push(f),
      },
      broadcast: {
        sendMessage: async (ch, data) => { for (const s of subs) if (s.me !== me && s.ch === ch) setImmediate(() => s.f({ data: JSON.parse(JSON.stringify(data)) })); },
        onMessage: (ch, f) => subs.push({ me, ch, f }),
      },
      notification: { show: (t) => me.notes.push(t) },
    };
    return me;
  }
  return { obr, roomMd };
}
const T = C.KEYS.tabPrefix, E = C.KEYS.entryPrefix;

test('room.js: GM writes reach players; player edits reach the GM', async () => {
  const w = world(), gm = w.obr('GM'), pl = w.obr('PLAYER');
  const g = window.ChongRoom(gm.OBR, { answer: true, storage: memStore() });
  await g.ready;
  const p = window.ChongRoom(pl.OBR, { answer: true, storage: memStore() });
  await p.ready; await tick(); await tick();
  assert.ok(p.editable(), 'the GM answered the request');
  await g.write({ [T + 'r']: { name: 'Room' }, [E + '1']: { id: '1', tab: 'r', hp: 5 } });
  await tick(); await tick();
  assert.strictEqual(p.md()[E + '1'].hp, 5);
  assert.ok(await p.write({ [E + '1']: { id: '1', tab: 'r', hp: 3 } }));
  await tick(); await tick(); await tick();
  assert.strictEqual(g.md()[E + '1'].hp, 3, 'the GM applied the edit');
  assert.strictEqual(p.list().v, g.list().v, 'the player has the GM\'s new version');
});

test('room.js: read-only while the GM is away', async () => {
  const w = world(), pl = w.obr('PLAYER');
  const p = window.ChongRoom(pl.OBR, { storage: memStore() });
  await p.ready; await tick();
  assert.ok(!p.editable());
  assert.strictEqual(await p.write({ [E + '9']: { id: '9' } }), false);
  assert.ok(pl.notes.length);
});

test('room.js: old room metadata moves into the GM copy; big lists arrive in pieces', async () => {
  const w = world();
  w.roomMd.metadata = { [T + 'old']: { name: 'Old' }, [E + 'o']: { id: 'o', tab: 'old' }, 'other.ext/key': 1 };
  const gm = w.obr('GM'), pl = w.obr('PLAYER');
  const g = window.ChongRoom(gm.OBR, { answer: true, storage: memStore() });
  await g.ready;
  assert.ok(g.md()[T + 'old'] && g.md()[E + 'o']);
  assert.deepStrictEqual(w.roomMd.metadata, { 'other.ext/key': 1 }, 'only our keys removed');
  const patch = {};
  for (let i = 0; i < 400; i++) patch[E + i] = { id: String(i), tab: 'old', name: 'Goblin ' + i, note: 'x'.repeat(40) };
  await g.write(patch);
  const p = window.ChongRoom(pl.OBR, { storage: memStore() });
  await p.ready;
  for (let i = 0; i < 20; i++) await tick();
  assert.strictEqual(Object.keys(p.md()).filter((k) => k.startsWith(E)).length, 401);
});
```

Run `node --test "chongs-tracker/tests/*.test.js"` → all pass (fix `room.js`, not the test, if one fails; if a test assumption about timing is wrong, add more `await tick()` rather than weakening an assertion).

- [ ] **Step 2:** In `index.html` add `<script src="room.js?v=1.13.0"></script>` right after the `core.js` script; same in `background.html`.
- [ ] **Step 3:** `node --check chongs-tracker/room.js`; `npm test` → fail 0.
- [ ] **Step 4: Commit** — `git add chongs-tracker/room.js chongs-tracker/tests/room.test.js chongs-tracker/index.html chongs-tracker/background.html && git commit -m "Chong's Tracker: room.js keeps room tabs in the GM's browser and shares them by broadcast"`

---

### Task 3: The panel uses the room copy

**Goal:** `app.js` reads and writes room tabs through `ChongRoom` instead of `OBR.room`, shows room tabs read-only to players while the GM is away, drops the 16 kB warning, and gives the GM Export / Import room tabs in the help.

**Files:**
- Modify: `chongs-tracker/app.js`, `chongs-tracker/index.html` (help buttons), `chongs-tracker/core.js` (drop `ROOM_LIMIT`/`metadataSize` if unused), `chongs-tracker/tests/core.test.js` (drop their test if any)

**Acceptance Criteria:**
- [ ] No `OBR.room.setMetadata` / `OBR.room.getMetadata` / `OBR.room.onMetadataChange` left in `app.js`
- [ ] `write(patch, true)` goes to `room.write(patch)`; a `false` result reloads from the copy (nothing changed)
- [ ] `reload()` reads `C.readState(sceneMd, room.md())`; `room`'s `onChange` calls `reload()`
- [ ] A player's room-tab entries are not editable and the add box is off on room tabs while `!room.editable()` (wrap every `C.canEdit(...)` call and the `canAdd` checks); GMs unaffected
- [ ] The door button's confirm no longer mentions 16 kB / shared storage; the size warning is gone
- [ ] Help (GM only, inside the `.gm` part): **Export room tabs** downloads `chongs-tracker-room.json` (`C.roomFile(room.list())`); **Import room tabs** reads a `.json` with `C.readRoomFile`, refuses with a notification if `null`, else `room.importMd(md)`
- [ ] Text is set with `textContent` only

**Verify:** `node --check chongs-tracker/app.js`, `npm test` → fail 0; behaviour in Task 5.

**Steps:**

- [ ] **Step 1: Create the room copy** — at the top of `OBR.onReady` (before reading the scene), replace

```js
    roomMd = await OBR.room.getMetadata();
    OBR.room.onMetadataChange((md) => { roomMd = md; reload(); });
```

with

```js
    room = window.ChongRoom(OBR, { answer: false, onChange: () => reload() });
    await room.ready;
```

and change `let sceneMd = {}, roomMd = {};` to `let sceneMd = {}, room = null;`.

- [ ] **Step 2: Writing** — in `write(patch, room = false)` rename the parameter to `toRoom` and replace the room branch:

```js
async function write(patch, toRoom = false) {
  if (!Object.keys(patch).length) return true;
  try {
    if (!toRoom) { await OBR.scene.setMetadata(patch); return true; }
    const ok = await room.write(patch);
    if (!ok) reload(); // read-only: back to the GM's copy
    return ok;
  } catch (err) {
    OBR.notification.show(`Chong's Tracker couldn't save: ${err.message || err}`, 'ERROR');
    return false;
  }
}
```

(Check the other functions that pass a second argument named `room` — `saveEntries`, `deleteEntries` use local objects called `room`; rename those locals to `rp` so they don't shadow the module-level `room`.)

- [ ] **Step 3: Reading** — `reload()` uses `C.readState(sceneMd, room ? room.md() : {})`.

- [ ] **Step 4: Read-only** — add next to `canManageTab`:

```js
// Room tabs are read-only for players while the GM is away (nobody to save them).
const roomLocked = (tabId) => role !== 'GM' && inRoom(tabId) && !(room && room.editable());
const mayEdit = (e) => C.canEdit(e, role, tabs) && !roomLocked(e.tab);
```

Replace every `C.canEdit(e, role, tabs)` / `C.canEdit(x, role, tabs)` in `app.js` with `mayEdit(...)`, and add `&& !roomLocked(<tab id>)` to each `canAdd` expression (`const canAdd = role === 'GM' || C.isPlayerTab(...)` → `(...) && !roomLocked(<that tab's id>)`), and to `canManageTab`/`canRoom` for players.

- [ ] **Step 5: Door confirm** — the save-to-room text becomes:

```js
    ? `Save "${tab.name}" to the room?\n\nIt will show in every scene in this room. The GM's browser keeps it and shares it with the players while the GM is here. Token links are per scene: attach tokens again in each scene.`
```

- [ ] **Step 6: Export / Import** — in `index.html`'s help, inside the GM-only part, add:

```html
  <h2>Room tabs</h2>
  <p>Room tabs are kept in your browser. Save a copy, or load one on another computer.</p>
  <p><button class="btn" type="button" id="room-export">Export room tabs</button>
     <button class="btn" type="button" id="room-import">Import room tabs</button>
     <input type="file" id="room-file" accept=".json,application/json" hidden></p>
```

(Find how the help marks GM-only paragraphs — the `help` element gets class `gm` for GMs; follow the existing pattern, e.g. a `gm-only` class, so players don't see this block.) In `app.js`:

```js
$('room-export').addEventListener('click', () => {
  const a = el('a', { href: URL.createObjectURL(new Blob([C.roomFile(room.list())], { type: 'application/json' })), download: 'chongs-tracker-room.json' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('room-import').addEventListener('click', () => $('room-file').click());
$('room-file').addEventListener('change', async (ev) => {
  const f = ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  const md = C.readRoomFile(await f.text());
  if (!md) { OBR.notification.show("That isn't a room tabs file", 'ERROR'); return; }
  room.importMd(md);
});
```

Guard these listeners so the standalone page (no Owlbear) doesn't break: attach them inside `OBR.onReady`, or check `room` before use.

- [ ] **Step 7:** Remove `ROOM_LIMIT` and `metadataSize` from `core.js` (and its export and any test) if nothing else uses them (`grep -rn "metadataSize\|ROOM_LIMIT" chongs-tracker`).
- [ ] **Step 8:** `node --check chongs-tracker/app.js`; `npm test` → fail 0.
- [ ] **Step 9: Commit** — `git add chongs-tracker && git commit -m "Chong's Tracker: the panel reads and writes room tabs through the GM's copy"`

---

### Task 4: Badges and Track use the room copy

**Goal:** `background.js` draws badges from the room copy, answers players (it's the one that answers), and Track into a room tab goes through `room.write`.

**Files:**
- Modify: `chongs-tracker/background.js`

**Acceptance Criteria:**
- [ ] No `OBR.room.*Metadata` calls left in `background.js`
- [ ] `room = ChongRoom(OBR, { answer: true, onChange: schedule })`, awaited in `OBR.onReady`
- [ ] Badges read `C.readState(metadata, room.md())`
- [ ] `track()`: room tab → `await room.write(patch)`; if it returns `false`, nothing is added (the notification comes from `room.write`); scene tab unchanged

**Verify:** `node --check chongs-tracker/background.js`, `npm test` → fail 0.

**Steps:**

- [ ] **Step 1:** Replace `let roomMetadata = {};` with `let room = null;`; in the badge code replace `C.readState(metadata, roomMetadata)` with `C.readState(metadata, room ? room.md() : {})`.
- [ ] **Step 2:** In `OBR.onReady`, replace

```js
  roomMetadata = await OBR.room.getMetadata();
  OBR.room.onMetadataChange((md) => { roomMetadata = md; schedule(); });
```

with

```js
  room = window.ChongRoom(OBR, { answer: true, onChange: schedule });
  await room.ready;
```

- [ ] **Step 3:** In `track()`: `C.readState(md, room.md())`, and

```js
  if (Object.keys(patch).length) {
    if (tabs.find((t) => t.id === tab).room) { if (!(await room.write(patch))) return; }
    else await OBR.scene.setMetadata(patch);
  }
```

- [ ] **Step 4:** `node --check chongs-tracker/background.js`; `npm test` → fail 0.
- [ ] **Step 5: Commit** — `git add chongs-tracker/background.js && git commit -m "Chong's Tracker: badges and Track use the GM's room copy"`

---

### Task 5: Version, docs, browser check, push

**Goal:** Version 1.13.0 everywhere, docs updated, behaviour checked against a fake Owlbear with a GM page and a player page, pushed.

**Files:**
- Modify: `chongs-tracker/manifest.json`, `chongs-tracker/index.html`, `chongs-tracker/background.html` (all `?v=`), `CLAUDE.md` (tracker rule 3), `README.md` (tracker section: room tabs), `chongs-tracker/TRACKER.md`

**Acceptance Criteria:**
- [ ] `manifest.json` version `1.13.0`; every `?v=` in both HTML files is `1.13.0` (`grep -n "?v=" chongs-tracker/*.html`)
- [ ] CLAUDE.md tracker rule 3 says: room tabs (and their entries) live in the GM's browser (localStorage `com.chongkit.tracker/room/<room id>`, the same key shape) and reach players by broadcast on `com.chongkit.tracker/room` (`room.js`); players keep the last copy and are read-only while the GM is away; old room-metadata keys are moved once by the GM's background and only read until then
- [ ] README tracker section explains room tabs from the table's point of view (kept on the GM's computer, shared while the GM is in the room, Export/Import in the GM's help)
- [ ] `chongs-tracker/TRACKER.md` gets a v1.13.0 section with the changes ticked
- [ ] `npm test` passes (including `tests/room.test.js`); pushed to `main`

**Verify:** `git log origin/main --oneline -1` shows the docs commit.

**Steps:**

- [ ] **Step 1:** Bump versions and update the three docs.
- [ ] **Step 2:** Run `node --test "chongs-tracker/tests/*.test.js"` (includes `room.test.js` from Task 2). The controller then lists for the user what to check in a real Owlbear room: GM saves a tab to the room → a player sees it; the player edits HP → the GM sees it; GM leaves → the player's room tab goes read-only within 30 s; a room tab made before 1.13.0 is still there after the GM opens the room.
- [ ] **Step 3:** `npm test` → fail 0; `git pull --rebase origin main`; commit `Chong's Tracker 1.13.0: room tabs kept by the GM, shared by broadcast`; `git push origin main`.
