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
    const ours = (m) => Object.fromEntries(Object.entries(m).filter(([k]) => k.startsWith(C.KEYS.tabPrefix) || k.startsWith(C.KEYS.entryPrefix)));
    const hear = () => { if (role === 'GM') return; heard = Date.now(); try { storage.setItem(key + '/heard', String(heard)); } catch {} };

    function apply(patch) { // GM: the real copy changes
      list = { v: list.v + 1, md: C.applyRoomPatch(list.md, patch) };
      save();
      sendList();
      onChange();
    }
    function got(l) { // a list from a GM
      if (!C.newerList(list, l)) { hear(); return; }
      list = { v: l.v, md: C.readRoomCopy(JSON.stringify(l)).md };
      hear();
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
      legacy = ours(await OBR.room.getMetadata());
      OBR.room.onMetadataChange((m) => { legacy = ours(m); onChange(); });
      OBR.player.onChange((p) => { if (p.role !== role) { role = p.role; onChange(); } });
      OBR.broadcast.onMessage(C.ROOM_CHANNEL, (ev) => onMessage(ev.data));
      if (storage === window.localStorage) window.addEventListener('storage', (ev) => { if (ev.key === key || ev.key === key + '/heard') { load(); onChange(); } });
      if (role === 'GM' && answer) await moveOld().catch(() => {});
      if (role === 'GM' && answer) sendList();
      if (role !== 'GM') send({ type: 'request' });
      const t = setInterval(() => { if (role !== 'GM' && !editable()) send({ type: 'request' }); onChange(); }, C.ASK_EVERY);
      if (t && t.unref) t.unref();
    })();

    return { ready, md, write, editable, importMd, list: () => list, role: () => role };
  };
})();
