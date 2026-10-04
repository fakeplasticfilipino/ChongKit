// Character Sheet: pure logic (no DOM), so it runs in the browser (window.Sheet) and under Node
// for tests (module.exports).
// The layout is our table's sheet: six stats (each with a small number slot), three saves,
// Armor, Hit Points, Initiative / Speed, Wounds (plus five optional extra circles), ten skills
// (each tied to a stat), tabs of collapsible entries, and tabs of notes. These are labels, not numbers
// from the GM Guide. Derived (not printed in the GM Guide): a skill is its stat plus the skill
// points put into it, and Initiative is DEX plus any bonus.

(function (root) {
  const VERSION = 4;
  const STORE = 'chongkit.sheets'; // localStorage: { current, chars: { id: sheet } }

  const STATS = [
    { id: 'str', name: 'STR' }, { id: 'dex', name: 'DEX' }, { id: 'con', name: 'CON' },
    { id: 'int', name: 'INT' }, { id: 'wis', name: 'WIS' }, { id: 'cha', name: 'CHA' },
  ];
  const SAVES = [{ id: 'str', name: 'STR' }, { id: 'dex', name: 'DEX' }, { id: 'wil', name: 'WIL' }];
  const SKILLS = [
    { id: 'arcana', name: 'Arcana', stat: 'int' },
    { id: 'examination', name: 'Examination', stat: 'int' },
    { id: 'influence', name: 'Influence', stat: 'cha' },
    { id: 'insight', name: 'Insight', stat: 'cha' },
    { id: 'intimidation', name: 'Intimidation', stat: 'str' },
    { id: 'lore', name: 'Lore', stat: 'int' },
    { id: 'naturecraft', name: 'Naturecraft', stat: 'wis' },
    { id: 'perception', name: 'Perception', stat: 'wis' },
    { id: 'sleight', name: 'Sleight of Hand', stat: 'dex' },
    { id: 'stealth', name: 'Stealth', stat: 'dex' },
  ];
  // The boxes each section shows by default (any of them can be removed and restored).
  const SECTIONS = {
    header: ['name', 'cls', 'ancestry', 'height', 'weight', 'hitDice'],
    stats: STATS.map((s) => s.id),
    saves: SAVES.map((s) => s.id),
    combat: ['armor', 'hp', 'initSpeed', 'wounds'],
    skills: SKILLS.map((s) => s.id),
  };
  const TABS = ['Actions', 'Abilities', 'Inventory'];
  // Kinds of box: another of the section's own kind (stat, save, skill, a detail line) or, in
  // Combat, a number or current/max box like Armor and HP.
  const BOX_TYPES = ['num', 'text', 'pair', 'skill', 'stat', 'save'];
  const ADDS = { header: ['text'], stats: ['stat'], saves: ['save'], combat: ['num', 'pair'], skills: ['skill'] };
  const WOUNDS = 6; // five circles and the skull
  const EXTRA_WOUNDS = 5; // the optional row of small dashed circles under the track

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const int = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
  const str = (v) => (v == null ? '' : String(v));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const mode = (v) => (v === 'adv' || v === 'dis' ? v : '');
  const emptyExtras = () => Object.fromEntries(Object.keys(SECTIONS).map((k) => [k, []]));

  function newBox(section, type, extra = {}) {
    const t = BOX_TYPES.includes(type) ? type : 'num';
    const box = { id: uid(), type: t, label: '', value: '' };
    if (t === 'pair') box.max = '';
    if (t === 'skill') { box.stat = 'str'; box.points = 0; delete box.value; }
    if (t === 'stat') { box.value = 0; box.slot = ''; box.key = false; }
    if (t === 'save') box.mode = '';
    return Object.assign(box, extra);
  }
  const newEntry = (extra = {}) => ({ id: uid(), title: '', sum: '', body: '', ...extra });
  const newTab = (name = '') => ({ id: uid(), name, entries: [] });
  const newNote = (name = '', text = '') => ({ id: uid(), name, text });

  function blank(name = '') {
    const s = {
      v: VERSION, id: uid(), name, updated: 0, owner: '',
      cls: '', ancestry: '', height: '', weight: '', speed: '',
      hitDice: { cur: '1', die: '' },
      hp: { cur: '', max: '', temp: '' },
      armor: '', initBonus: 0, wounds: 0, woundsMax: WOUNDS,
      woundExtra: false, woundMarks: Array(EXTRA_WOUNDS).fill(false),
      stats: {}, saves: {}, skills: {},
      removed: [], // default boxes taken off the sheet: `${section}:${id}`
      extras: emptyExtras(), // added boxes, shown in their section after the defaults
      tabs: TABS.map(newTab), tab: '',
      noteTabs: [newNote('Notes')], noteTab: '', // notes: tabs of free text
    };
    s.tab = s.tabs[0].id;
    s.noteTab = s.noteTabs[0].id;
    STATS.forEach((st) => { s.stats[st.id] = { val: 0, slot: '', key: false }; });
    SAVES.forEach((sv) => { s.saves[sv.id] = { val: '', mode: '' }; });
    SKILLS.forEach((sk) => { s.skills[sk.id] = 0; });
    return s;
  }

  // Version 1 sheets (four stats, Nimble's skill list, a "defense" section) move to the new
  // layout without losing anything typed: WIL becomes WIS, dropped skills with points become
  // extra skill boxes, level joins the class.
  function upgrade1(raw) {
    const r = JSON.parse(JSON.stringify(raw));
    const stats = r.stats || {};
    if (stats.wil && !stats.wis) stats.wis = stats.wil;
    r.saves = {};
    for (const id of ['str', 'dex', 'wil']) r.saves[id] = { val: '', mode: (stats[id] || {}).save };
    r.stats = stats;
    const lvl = str(r.level).trim();
    r.cls = [str(r.cls).trim(), str(r.cls).trim() && lvl ? lvl : ''].filter(Boolean).join(' ');
    const extras = r.extras || {};
    extras.combat = extras.defense || [];
    extras.header = (extras.header || []).slice();
    if (str(r.size).trim()) extras.header.push({ type: 'text', label: 'Size', value: r.size });
    extras.skills = (extras.skills || []).slice();
    const old = { finesse: ['Finesse', 'dex'], might: ['Might', 'str'] };
    for (const [id, [label, stat]] of Object.entries(old)) {
      const pts = int((r.skills || {})[id]);
      if (pts) extras.skills.push({ type: 'skill', label, stat, points: pts });
    }
    if (extras.stats) extras.stats.forEach((b) => { if (b && b.stat === 'wil') b.stat = 'wis'; });
    extras.skills.forEach((b) => { if (b && b.stat === 'wil') b.stat = 'wis'; });
    r.extras = extras;
    const moved = { 'header:origin': ['header:cls', 'header:ancestry'], 'header:heightWeight': ['header:height', 'header:weight'],
      'header:sizeSpeed': [], 'stats:wil': ['stats:wis'], 'skills:finesse': [], 'skills:might': [] };
    r.removed = (Array.isArray(r.removed) ? r.removed : []).flatMap((k) => {
      if (moved[k]) return moved[k];
      return typeof k === 'string' && k.startsWith('defense:') ? ['combat:' + k.slice(8)] : [k];
    });
    return r;
  }
  // Version 2 sheets: added boxes now show on the sheet itself, so the starter Mana / Gold /
  // Inventory boxes go unless something was typed in them; the notes' entries become a Notes tab;
  // marked extra wound circles turn the extra row on.
  function upgrade2(raw) {
    const r = JSON.parse(JSON.stringify(raw));
    const starter = (b) => b && ['Mana', 'Gold', 'Inventory'].includes(b.label) && !str(b.value) && ['', '10'].includes(str(b.max));
    if (r.extras && Array.isArray(r.extras.combat)) r.extras.combat = r.extras.combat.filter((b) => !starter(b));
    const entries = Array.isArray(r.entries) ? r.entries.filter((e) => e && typeof e === 'object') : [];
    if (entries.length) {
      if (!Array.isArray(r.tabs)) r.tabs = TABS.map(newTab);
      r.tabs.push({ ...newTab('Notes'), entries });
    }
    delete r.entries;
    r.woundExtra = Array.isArray(r.woundMarks) && r.woundMarks.some(Boolean);
    return r;
  }

  function normBox(sec, b) {
    const box = newBox(sec, b.type);
    box.id = str(b.id) || box.id;
    box.label = str(b.label);
    if (box.type === 'skill') { box.stat = str(b.stat).slice(0, 24); box.points = int(b.points); } // free text, see skillStat
    else if (box.type === 'stat') { box.value = int(b.value); box.slot = str(b.slot); box.key = !!b.key; }
    else box.value = str(b.value);
    if (box.type === 'pair') box.max = str(b.max);
    if (box.type === 'save') box.mode = mode(b.mode);
    return box;
  }
  const normEntries = (list) => (Array.isArray(list) ? list : []).filter((e) => e && typeof e === 'object')
    .map((e) => ({ id: str(e.id) || uid(), title: str(e.title), sum: str(e.sum), body: str(e.body) }));

  // Anything loaded (old saves, imports) is filled out to the current shape.
  function normalize(input) {
    if (!input || typeof input !== 'object') return blank();
    let raw = input;
    if (int(raw.v, 1) < 2) raw = upgrade1(raw);
    if (int(input.v, 1) < 3) raw = upgrade2(raw);
    if (int(input.v, 1) < 4) raw = { ...raw, noteTabs: [newNote('Notes', str(raw.notes))] }; // v3 notes: one tab
    const s = blank();
    s.extras = emptyExtras();
    for (const k of ['id', 'name', 'cls', 'ancestry', 'height', 'weight', 'speed', 'armor']) {
      if (raw[k] != null) s[k] = str(raw[k]);
    }
    if (!s.id) s.id = uid();
    // Last edit (ms), for syncing; 0 = never edited. Saves from before syncing have none: they count
    // as edited (so they're uploaded on first sign-in) but older than anything in the account.
    s.updated = raw.updated == null ? 1 : Math.max(0, int(raw.updated));
    s.owner = str(raw.owner); // the account it was synced to ('' = this browser only)
    s.hitDice = { cur: str((raw.hitDice || {}).cur ?? '1'), die: str((raw.hitDice || {}).die) };
    s.hp = { cur: str((raw.hp || {}).cur), max: str((raw.hp || {}).max), temp: str((raw.hp || {}).temp) };
    s.initBonus = int(raw.initBonus);
    s.woundsMax = clamp(int(raw.woundsMax, WOUNDS), 1, 20);
    s.wounds = clamp(int(raw.wounds), 0, s.woundsMax);
    s.woundExtra = !!raw.woundExtra;
    const marks = Array.isArray(raw.woundMarks) ? raw.woundMarks : [];
    s.woundMarks = s.woundMarks.map((_, i) => !!marks[i]);
    for (const st of STATS) {
      const r = (raw.stats || {})[st.id] || {};
      s.stats[st.id] = { val: int(r.val), slot: str(r.slot), key: !!r.key };
    }
    for (const sv of SAVES) {
      const r = (raw.saves || {})[sv.id] || {};
      s.saves[sv.id] = { val: str(r.val), mode: mode(r.mode) };
    }
    for (const sk of SKILLS) s.skills[sk.id] = int((raw.skills || {})[sk.id]);
    const known = new Set(Object.entries(SECTIONS).flatMap(([sec, ids]) => ids.map((id) => `${sec}:${id}`)));
    s.removed = Array.isArray(raw.removed) ? [...new Set(raw.removed.filter((r) => known.has(r)))] : [];
    for (const sec of Object.keys(SECTIONS)) {
      const list = Array.isArray((raw.extras || {})[sec]) ? raw.extras[sec] : [];
      s.extras[sec] = list.filter((b) => b && typeof b === 'object').map((b) => normBox(sec, b));
    }
    if (Array.isArray(raw.tabs)) {
      s.tabs = raw.tabs.filter((t) => t && typeof t === 'object')
        .map((t) => ({ id: str(t.id) || uid(), name: str(t.name), entries: normEntries(t.entries) }));
    }
    s.tab = s.tabs.some((t) => t.id === raw.tab) ? raw.tab : (s.tabs[0] || {}).id || '';
    if (Array.isArray(raw.noteTabs)) {
      s.noteTabs = raw.noteTabs.filter((t) => t && typeof t === 'object')
        .map((t) => ({ id: str(t.id) || uid(), name: str(t.name), text: str(t.text) }));
    }
    s.noteTab = s.noteTabs.some((t) => t.id === raw.noteTab) ? raw.noteTab : (s.noteTabs[0] || {}).id || '';
    return s;
  }

  // Every stat a skill can follow: the six, then any added stat boxes (by their label).
  const statList = (s) => STATS.map((x) => ({ id: x.id, name: x.name }))
    .concat(((s.extras || {}).stats || []).filter((b) => b.type === 'stat').map((b) => ({ id: b.id, name: b.label || 'Stat' })));
  function statVal(s, id) {
    if (s.stats[id]) return s.stats[id].val;
    const b = ((s.extras || {}).stats || []).find((x) => x.id === id && x.type === 'stat');
    return b ? int(b.value) : 0;
  }
  const skillTotal = (s, id) => statVal(s, (SKILLS.find((k) => k.id === id) || {}).stat) + (s.skills[id] || 0);
  // An added skill's stat is free text (some systems don't tie skills to stats). When it names a stat
  // (an id like 'dex', or a stat's name like 'DEX' or an added stat's label) the skill follows it;
  // otherwise the skill is a plain number.
  function skillStat(s, text) {
    const t = str(text).trim().toLowerCase();
    if (!t) return null;
    return statList(s).find((x) => x.id.toLowerCase() === t || x.name.toLowerCase() === t) || null;
  }
  const boxSkillTotal = (s, box) => { const st = skillStat(s, box.stat); return (st ? statVal(s, st.id) : 0) + (box.points || 0); };
  const initiative = (s) => statVal(s, 'dex') + (s.initBonus || 0);
  // Typing a total into a skill (or Initiative) keeps it tied to its stat: store the difference.
  const pointsFor = (total, stat) => int(total) - stat;

  // Click a wound circle: fill up to it, or clear it if it's the last one filled.
  const setWounds = (current, index) => (index + 1 === current ? index : index + 1);

  // Save advantage / disadvantage: the pip cycles none → ▲ advantage → ▼ disadvantage → none.
  const cycleSave = (current) => ({ '': 'adv', adv: 'dis', dis: '' })[mode(current)];

  // Bloodied: at or below half Max HP.
  function bloodied(hp) {
    const cur = parseFloat(hp.cur), max = parseFloat(hp.max);
    return Number.isFinite(cur) && Number.isFinite(max) && max > 0 && cur <= max / 2;
  }

  // Calculator boxes (HP, Temp HP, counters): "-4" and "+3" change what's there, "13-4" or "10"
  // set it. Returns the new text, or null if it isn't math (then the text is kept as typed).
  function evalExpr(text) {
    const src = String(text).replace(/\s+/g, '');
    if (!src || !/^[0-9+\-*/().]+$/.test(src)) return null;
    let i = 0;
    const peek = () => src[i];
    function number() {
      const m = /^\d+(\.\d+)?|^\.\d+/.exec(src.slice(i));
      if (!m) throw new Error('number');
      i += m[0].length;
      return parseFloat(m[0]);
    }
    function factor() {
      if (peek() === '+') { i++; return factor(); }
      if (peek() === '-') { i++; return -factor(); }
      if (peek() === '(') { i++; const v = expr(); if (peek() !== ')') throw new Error(')'); i++; return v; }
      return number();
    }
    function term() { let v = factor(); while (peek() === '*' || peek() === '/') { const op = src[i++]; const r = factor(); v = op === '*' ? v * r : v / r; } return v; }
    function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const op = src[i++]; const r = term(); v = op === '+' ? v + r : v - r; } return v; }
    try { const v = expr(); return i === src.length && Number.isFinite(v) ? v : null; } catch { return null; }
  }
  function applyMath(text, previous) {
    const t = String(text).trim().replace(/−/g, '-');
    if (t === '') return '';
    const v = evalExpr(t);
    if (v === null) return null;
    const prev = parseFloat(previous);
    if (/^[+-]/.test(t) && Number.isFinite(prev)) return String(Math.trunc(prev + v));
    // A sign into an empty box is a modifier: keep it (+2 stays +2).
    if (/^\+/.test(t)) return signed(Math.trunc(v));
    return String(Math.trunc(v));
  }

  // Modifiers: shown with their sign (+3, 0, -1); typed as 3, +3, -1 (or the − sign).
  const signed = (n) => (n > 0 ? `+${n}` : String(n));
  function parseModifier(text) {
    const m = /^\s*([+\-−]?)\s*(\d{1,6})\s*$/.exec(String(text));
    if (!m) return null;
    return (m[1] && m[1] !== '+' ? -1 : 1) * parseInt(m[2], 10);
  }

  const isRemoved = (s, section, id) => s.removed.includes(`${section}:${id}`);
  function setRemoved(s, section, id, on) {
    const key = `${section}:${id}`;
    const removed = s.removed.filter((r) => r !== key);
    if (on) removed.push(key);
    return { ...s, removed };
  }

  // Undo a layout change (remove, delete, add, move, tabs): bring back the earlier layout, but
  // keep everything typed since then (boxes, entries and tabs that still exist keep their text).
  function undoLayout(prev, cur) {
    const pick = (before, now) => before.map((b) => now.find((c) => c.id === b.id) || b);
    const out = { ...cur, removed: prev.removed.slice(), woundsMax: prev.woundsMax, woundExtra: !!prev.woundExtra };
    out.wounds = Math.min(cur.wounds, out.woundsMax);
    out.extras = Object.fromEntries(Object.keys(SECTIONS).map((k) => [k, pick((prev.extras || {})[k] || [], (cur.extras || {})[k] || [])]));
    out.tabs = (prev.tabs || []).map((t) => {
      const now = (cur.tabs || []).find((c) => c.id === t.id);
      return now ? { ...now, entries: pick(t.entries, now.entries) } : t;
    });
    if (!out.tabs.some((t) => t.id === out.tab)) out.tab = prev.tab;
    out.noteTabs = (prev.noteTabs || []).map((t) => (cur.noteTabs || []).find((c) => c.id === t.id) || t);
    if (!out.noteTabs.some((t) => t.id === out.noteTab)) out.noteTab = prev.noteTab;
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
    return { ...normalize(raw), id: uid(), owner: '', updated: Date.now() }; // a new character of yours
  }

  const api = {
    VERSION, STORE, STATS, SAVES, SKILLS, SECTIONS, TABS, BOX_TYPES, ADDS, WOUNDS, EXTRA_WOUNDS, uid,
    blank, normalize, newBox, newEntry, newTab, newNote, statList, statVal, skillStat, skillTotal, boxSkillTotal, initiative, pointsFor,
    setWounds, cycleSave, bloodied, evalExpr, applyMath, signed, parseModifier, isRemoved, setRemoved, undoLayout, move,
    loadAll, saveAll, exportJson, importJson, mergeChars, content,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Sheet = api;
})(this);
