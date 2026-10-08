// Character Sheet: pure logic (no DOM), so it runs in the browser (window.Sheet) and under Node
// for tests (module.exports).
// v4 sheet, data version 5: a sheet you write on. Every box holds the text typed into it; nothing
// is worked out from anything else. The layout is lists of boxes with caps (the table's choice, for
// looks): details, current / max pairs, small boxes, wounds, stats (each with a save pip), skills,
// and tabs of four note boxes holding notes (a name and a description). Derived (not from the GM
// Guide): the layout, the defaults and the caps. The default stats and skills are Nimble's.

(function (root) {
  const VERSION = 5;
  const STORE = 'chongkit.sheets'; // localStorage: { current, chars: { id: sheet } }

  const CAPS = { details: 6, pairs: 2, boxes: 6, stats: 12, skills: 18 };
  const PER_ROW = { boxes: 3, stats: 6, skills: 6 }; // the most boxes in one row (phones: 3)
  const WOUNDS = 6; // five circles and the skull
  const EXTRA_WOUNDS = 3; // the dashed circles after the skull
  const NOTE_BOXES = 4; // every tab has exactly four note boxes
  const DEFAULTS = {
    details: ['Hit Die', 'Level'],
    stats: ['STR', 'DEX', 'INT', 'WIL'],
    skills: ['Arcana', 'Examination', 'Finesse', 'Influence', 'Insight', 'Lore', 'Might', 'Naturecraft', 'Perception', 'Stealth'],
    tabs: ['Actions'],
  };

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const int = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
  const str = (v) => (v == null ? '' : String(v));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const mode = (v) => (v === 'adv' || v === 'dis' ? v : '');

  const newDetail = (label = '') => ({ id: uid(), label, value: '' });
  const newPair = (label = '', maxLabel = '') => ({ id: uid(), label, maxLabel, cur: '', max: '' });
  const newBox = (label = '') => ({ id: uid(), label, value: '' });
  const newStat = (label = '') => ({ id: uid(), label, value: '', mode: '' });
  const newSkill = (label = '') => ({ id: uid(), label, value: '' });
  const newNote = (name = '', text = '', folded = false) => ({ id: uid(), name, text, folded });
  const newNoteBox = (title = '') => ({ id: uid(), title, notes: [] });
  const newTab = (name = '') => ({ id: uid(), name, boxes: Array.from({ length: NOTE_BOXES }, () => newNoteBox()) });

  function blank(name = '') {
    const s = {
      v: VERSION, id: uid(), name, updated: 0, owner: '',
      details: DEFAULTS.details.map((l) => newDetail(l)),
      pairs: [newPair('Current HP', 'Max HP')],
      boxes: [newBox('Temp HP'), newBox('Armor'), newBox('Initiative')],
      wounds: 0, woundMarks: Array(EXTRA_WOUNDS).fill(false),
      stats: DEFAULTS.stats.map((l) => newStat(l)),
      skills: DEFAULTS.skills.map((l) => newSkill(l)),
      tabs: DEFAULTS.tabs.map((n) => newTab(n)), tab: '',
    };
    s.tab = s.tabs[0].id;
    return s;
  }

  // Anything loaded (saves, imports, the account) is filled out to the current shape. Older versions
  // aren't upgraded: they open as a blank sheet that keeps only their id, owner and last edit, so
  // syncing still matches them up.
  const objs = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : null);
  const keepId = (x) => str(x.id) || uid();
  const READ = {
    details: (d) => ({ id: keepId(d), label: str(d.label), value: str(d.value) }),
    pairs: (p) => ({ id: keepId(p), label: str(p.label), maxLabel: str(p.maxLabel), cur: str(p.cur), max: str(p.max) }),
    boxes: (b) => ({ id: keepId(b), label: str(b.label), value: str(b.value) }),
    stats: (x) => ({ id: keepId(x), label: str(x.label), value: str(x.value), mode: mode(x.mode) }),
    skills: (x) => ({ id: keepId(x), label: str(x.label), value: str(x.value) }),
  };
  // A note is a name and a description. Notes saved before they had a name keep all their text in
  // `text`: its first line becomes the name, the rest the description.
  function readNote(n) {
    let name = str(n.name), text = str(n.text);
    if (n.name == null) { const lines = text.split('\n'); name = lines.shift().trim(); text = lines.join('\n'); }
    return { id: keepId(n), name, text, folded: !!n.folded };
  }
  const readNoteBox = (b) => ({ id: keepId(b), title: str(b.title), notes: (objs(b.notes) || []).map(readNote) });
  // Exactly four boxes per tab: missing ones are added; the notes of any past the fourth move into it.
  function readTab(t) {
    const boxes = (objs(t.boxes) || []).map(readNoteBox);
    while (boxes.length < NOTE_BOXES) boxes.push(newNoteBox());
    const extra = boxes.splice(NOTE_BOXES);
    boxes[NOTE_BOXES - 1].notes.push(...extra.flatMap((b) => b.notes));
    return { id: keepId(t), name: str(t.name), boxes };
  }

  function normalize(input) {
    if (!input || typeof input !== 'object') return blank();
    const s = blank();
    s.id = str(input.id) || s.id;
    // Last edit (ms), for syncing; 0 = never edited. Saves without one count as edited (so they're
    // uploaded on first sign-in) but older than anything in the account.
    s.updated = input.updated == null ? 1 : Math.max(0, int(input.updated));
    s.owner = str(input.owner); // the account it was synced to ('' = this browser only)
    if (int(input.v, 1) < VERSION) return s;
    s.name = str(input.name);
    for (const k of Object.keys(CAPS)) {
      const list = objs(input[k]);
      if (list) s[k] = list.slice(0, CAPS[k]).map(READ[k]); // a missing list keeps the defaults
    }
    s.wounds = clamp(int(input.wounds), 0, WOUNDS);
    const marks = Array.isArray(input.woundMarks) ? input.woundMarks : [];
    s.woundMarks = s.woundMarks.map((_, i) => !!marks[i]);
    const tabs = objs(input.tabs);
    if (tabs) s.tabs = tabs.map(readTab);
    s.tab = s.tabs.some((t) => t.id === input.tab) ? input.tab : (s.tabs[0] || {}).id || '';
    return s;
  }

  // Reset: the character starts again from the default layout, keeping who it is (id and owner).
  const reset = (s) => ({ ...blank(), id: s.id, owner: s.owner, updated: s.updated });

  const canAdd = (s, key) => s[key].length < CAPS[key];
  // Even rows: the fewest rows of at most `per` boxes, spread evenly, so no box sits alone on a row
  // (7 → 4 + 3, 12 → 6 + 6, 18 → 6 + 6 + 6). Returns the number of columns.
  function columns(n, per) {
    if (n < 1) return 1;
    return Math.ceil(n / Math.ceil(n / per));
  }

  // Swap two note boxes of a tab (with their notes). Returns the new boxes; the input is left as it was.
  function swapBoxes(boxes, i, j) {
    const out = boxes.slice();
    if (i === j || !out[i] || !out[j]) return out;
    [out[i], out[j]] = [out[j], out[i]];
    return out;
  }

  // Move a note within its box or into another box of the same tab. `at` is the index in the target
  // box to go before (null: the end). Returns the tab's new boxes; the input is left as it was.
  function moveNote(boxes, fromBox, noteId, toBox, at = null) {
    const out = boxes.map((b) => ({ ...b, notes: b.notes.slice() }));
    const src = out.find((b) => b.id === fromBox);
    const dst = out.find((b) => b.id === toBox);
    if (!src || !dst) return out;
    const i = src.notes.findIndex((n) => n.id === noteId);
    if (i < 0) return out;
    const [n] = src.notes.splice(i, 1);
    let pos = at == null ? dst.notes.length : at;
    if (src === dst && at != null && i < at) pos -= 1;
    dst.notes.splice(clamp(pos, 0, dst.notes.length), 0, n);
    return out;
  }

  // ↑ / ↓ on a box: a whole number steps (a "+2" modifier keeps its sign: "+3"); other text is left alone.
  const signed = (n) => (n > 0 ? `+${n}` : String(n));
  function step(text, by) {
    const t = str(text).trim().replace(/−/g, '-');
    if (t === '') return String(by);
    if (!/^[+-]?\d+$/.test(t)) return str(text);
    const v = parseInt(t, 10) + by;
    return /^[+-]/.test(t) ? signed(v) : String(v);
  }

  // Click a wound circle: fill up to it, or clear it if it's the last one filled.
  const setWounds = (current, index) => (index + 1 === current ? index : index + 1);
  // A stat's save pip cycles none → ▲ advantage → ▼ disadvantage → none.
  const cycleSave = (current) => ({ '': 'adv', adv: 'dis', dis: '' })[mode(current)];

  // Undo a layout change (remove, add, move, tabs, note boxes, notes): bring back the earlier lists,
  // but keep everything typed since (boxes, notes and tabs that still exist keep their text).
  function undoLayout(prev, cur) {
    const pick = (before, now) => before.map((b) => now.find((c) => c.id === b.id) || b);
    const out = { ...cur };
    for (const k of Object.keys(CAPS)) out[k] = pick(prev[k] || [], cur[k] || []);
    out.tabs = (prev.tabs || []).map((t) => {
      const now = (cur.tabs || []).find((c) => c.id === t.id);
      if (!now) return t;
      const notesNow = new Map((now.boxes || []).flatMap((b) => b.notes).map((n) => [n.id, n]));
      return { ...now, boxes: (t.boxes || []).map((b) => {
        const nb = (now.boxes || []).find((c) => c.id === b.id) || b;
        return { ...nb, notes: b.notes.map((n) => notesNow.get(n.id) || n) };
      }) };
    });
    if (!out.tabs.some((t) => t.id === out.tab)) out.tab = prev.tab;
    return out;
  }

  // Move an item in a list to another position.
  function move(list, from, to) {
    const out = list.slice();
    if (from < 0 || from >= out.length) return out;
    const [x] = out.splice(from, 1);
    out.splice(clamp(to, 0, out.length), 0, x);
    return out;
  }

  // --- Saving ---------------------------------------------------------------------
  // All characters live under one localStorage key. `storage` is localStorage (or a stand-in).
  function loadAll(storage) {
    let data = null;
    try { data = JSON.parse(storage.getItem(STORE)); } catch {}
    const chars = {};
    if (data && data.chars && typeof data.chars === 'object') {
      for (const raw of Object.values(data.chars)) { const s = normalize(raw); chars[s.id] = s; }
    }
    if (!Object.keys(chars).length) { const s = blank(); chars[s.id] = s; }
    const current = data && chars[data.current] ? data.current : Object.keys(chars)[0];
    return { current, chars };
  }
  function saveAll(storage, all) {
    try { storage.setItem(STORE, JSON.stringify(all)); return true; } catch { return false; }
  }

  // --- Syncing with an account ---------------------------------------------------------
  // `remote` is the account's characters ([{ id, data }]); `synced` the ids this browser has seen
  // in this account before; `user` the account's id; `deletes` ids deleted here but not yet in the
  // account. Returns the merged characters and the ids to upload:
  // - in both: the newer edit wins (uploaded if it's the local one);
  // - only remote: downloaded (unless it's waiting to be deleted);
  // - only local: uploaded if it was ever edited, dropped if it was synced before (deleted on
  //   another device), and kept but never uploaded if it belongs to another account.
  // Every character that ends up in the account is marked with its `owner`.
  function mergeChars(local, remote, synced = [], user = '', deletes = []) {
    const chars = {};
    const upload = [];
    const seen = new Set(synced);
    const gone = new Set(deletes);
    const inRemote = new Set();
    for (const row of remote || []) {
      if (!row || !row.data || gone.has(row.id)) continue;
      const r = normalize({ ...row.data, id: row.id });
      inRemote.add(r.id);
      const l = local[r.id];
      if (l && l.updated > r.updated && (!l.owner || l.owner === user)) { chars[l.id] = { ...l, owner: user }; upload.push(l.id); }
      else chars[r.id] = { ...r, owner: user };
    }
    for (const l of Object.values(local)) {
      if (inRemote.has(l.id) || gone.has(l.id)) continue;
      if (l.owner && l.owner !== user) { chars[l.id] = l; continue; } // another account's: never upload
      if (seen.has(l.id)) continue; // deleted elsewhere
      if (l.updated) { chars[l.id] = { ...l, owner: user }; upload.push(l.id); } else chars[l.id] = l;
    }
    return { chars, upload };
  }
  // The character without its timestamp and owner: two copies with the same content compare equal.
  const content = (s) => JSON.stringify({ ...s, updated: 0, owner: '' });
  const exportJson = (s) => JSON.stringify({ chongkitSheet: VERSION, ...s }, null, 2);
  // An imported character always gets a new id, so it never overwrites one you have.
  function importJson(text) {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || !raw.chongkitSheet) throw new Error('Not a ChongKit character');
    if (int(raw.v, 1) < VERSION) throw new Error('Saved before Character Sheet v4: it can\'t be opened');
    return { ...normalize(raw), id: uid(), owner: '', updated: Date.now() }; // a new character of yours
  }

  const api = {
    VERSION, STORE, CAPS, PER_ROW, WOUNDS, EXTRA_WOUNDS, NOTE_BOXES, DEFAULTS, uid,
    blank, normalize, reset, newDetail, newPair, newBox, newStat, newSkill, newNote, newNoteBox, newTab,
    canAdd, columns, swapBoxes, moveNote, step, signed, setWounds, cycleSave, undoLayout, move,
    loadAll, saveAll, exportJson, importJson, mergeChars, content,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Sheet = api;
})(this);
