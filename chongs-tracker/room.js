// Chong's Tracker: room tabs, kept by the GM. The GM's browser holds them (localStorage, the same
// key/value shape as room metadata); players get them by OBR broadcast and keep the last copy.
// Only the background page answers requests and applies players' edits, so each GM answers once.
// Browser global `ChongRoom` (a plain script, before the module that uses it).
(function () {
  const C = window.ChongCore;
  // Reading window.localStorage throws where storage is blocked: then the copy lives in memory only.
  const localStore = () => { try { return window.localStorage || null; } catch { return null; } };

  // Options: answer (the background page), onChange, storage (default localStorage), and for tests
  // now (a clock) and askEvery (ms between players' requests; the returned tick runs one by hand).
  window.ChongRoom = function (OBR, opts = {}) {
    const { answer = false, onChange = () => {}, now = Date.now, askEvery = C.ASK_EVERY } = opts;
    const isLocal = opts.storage === undefined;
    const storage = isLocal ? localStore() : opts.storage;
    let role = 'PLAYER', key = null, list = { v: 0, md: {} }, legacy = {}, heard = 0, pending = [], wasEditable = null;
    const buf = new Map();
    const load = () => { if (!storage) return; try { list = C.readRoomCopy(storage.getItem(key)); heard = Number(storage.getItem(key + '/heard')) || 0; } catch {} };
    const save = () => { if (!storage) return false; try { storage.setItem(key, JSON.stringify(list)); return true; } catch { return false; } };
    const send = (data) => OBR.broadcast.sendMessage(C.ROOM_CHANNEL, data, { destination: 'REMOTE' }).catch(() => {});
    const sendList = () => C.splitList({ type: 'list', v: list.v, md: list.md }, C.uid()).forEach(send);
    const sendCopy = () => C.splitList({ type: 'copy', v: list.v, md: list.md }, C.uid()).forEach(send);
    const editable = () => C.roomEditable(heard, now(), role);
    const md = () => pending.reduce((m, p) => C.applyRoomPatch(m, p), { ...legacy, ...list.md });
    const nextV = () => Math.max(list.v + 1, now()); // time-based: a GM restarting from an empty copy still wins
    const ours = (m) => Object.fromEntries(Object.entries(m).filter(([k]) => k.startsWith(C.KEYS.tabPrefix) || k.startsWith(C.KEYS.entryPrefix)));
    const hear = () => { if (role === 'GM') return; heard = now(); if (storage) try { storage.setItem(key + '/heard', String(heard)); } catch {} };
    const request = () => send({ type: 'request', v: list.v });

    function apply(patch) { // GM: the real copy changes
      if (role === 'GM') load(); // the panel and the background share one saved copy: start from the latest
      const next = C.applyRoomPatch(list.md, patch);
      if (JSON.stringify(next) === JSON.stringify(list.md)) return; // nothing of ours changed
      list = { v: nextV(), md: next };
      save();
      sendList();
      onChange();
    }
    function got(l) { // a list from a GM
      const fresh = C.newerList(list, l);
      if (fresh) list = { v: l.v, md: C.readRoomCopy(JSON.stringify(l)).md };
      hear();
      if (fresh) save();
      pending = []; // the GM's copy now decides; a quick edit it dropped goes away
      wasEditable = editable();
      onChange();
    }
    function gotCopy(l) { // GM background: a player's copy, newer than ours (a new or cleared GM browser)
      if (!C.newerList(list, l)) return;
      list = { v: l.v, md: C.readRoomCopy(JSON.stringify(l)).md };
      save();
      sendList();
      onChange();
    }
    function onMessage(data) {
      if (!data || typeof data !== 'object') return;
      if (data.type === 'piece') {
        const l = C.joinPieces(buf, data, now());
        if (l && l.type === 'list') got(l);
        if (l && l.type === 'copy' && answer && role === 'GM') gotCopy(l);
        return;
      }
      if (data.type === 'list') return got(data);
      if (role !== 'GM') { // only a GM sends these: it is here
        if (data.type === 'here' || data.type === 'ask-copy') { hear(); tick(false); }
        if (data.type === 'ask-copy' && list.v > 0) sendCopy();
        return;
      }
      if (!answer) return;
      if (data.type === 'request') {
        load();
        const theirs = typeof data.v === 'number' ? data.v : -1;
        if (list.v > theirs) sendList();
        else if (theirs > list.v) send({ type: 'ask-copy' }); // they hold a newer copy than this browser
        else send({ type: 'here', v: list.v });
      }
      if (data.type === 'edit') apply(data.patch);
    }
    // Players: ask the GM (it answers a list or "here"); either way, redraw only when editable changes.
    // Losing the GM drops edits not yet confirmed: they were never saved.
    function tick(ask = true) {
      if (ask && role !== 'GM') request();
      const e = editable();
      if (e === wasEditable) return;
      wasEditable = e;
      if (!e) pending = [];
      onChange();
    }
    async function moveOld() { // once per room: our old keys in room metadata move into the GM's copy
      const meta = await OBR.room.getMetadata();
      load();
      const m = C.moveRoomPatch(meta, list.md);
      if (!m) return;
      list = { v: nextV(), md: m.md };
      sendList();
      onChange();
      // Only delete the room's keys once they are safely saved here (and read back).
      if (!save()) return;
      let back;
      try { back = C.readRoomCopy(storage.getItem(key)).md; } catch { return; }
      if (!Object.keys(m.deletes).every((k) => back[k])) return;
      await OBR.room.setMetadata(m.deletes);
    }
    async function write(patch) {
      if (!Object.keys(patch || {}).length) return true;
      if (role === 'GM') { apply(patch); return true; }
      if (!editable()) { OBR.notification.show('Room tabs are read-only until the GM is back', 'WARNING'); return false; }
      send({ type: 'edit', patch });
      pending.push(patch); // shown now; the GM's next list replaces it
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
      if (isLocal && storage) window.addEventListener('storage', (ev) => { if (ev.key === key || ev.key === key + '/heard') { load(); onChange(); } });
      if (role === 'GM' && answer) await moveOld().catch(() => {});
      if (role === 'GM' && answer) { sendList(); if (list.v === 0) send({ type: 'ask-copy' }); }
      if (role !== 'GM') request();
      wasEditable = editable();
      const t = setInterval(tick, askEvery);
      if (t && t.unref) t.unref();
    })();

    return { ready, md, write, editable, importMd, tick, list: () => list, role: () => role };
  };
})();
