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
  assert.strictEqual(p.list().v, g.list().v, "the player has the GM's new version");
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
