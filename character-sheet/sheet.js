// Character Sheet: pure logic (no DOM), so it runs in the browser (window.Sheet) and under Node
// for tests (module.exports).
// The layout follows the official Nimble character sheet: four stats, ten skills (each tied to a
// stat), Hit Points with Temp HP, Armor, Initiative, Wounds and Hit Dice. These are labels from
// the sheet, not numbers from the GM Guide. Derived (not printed in the GM Guide), as on the sheet:
// a skill is its stat plus the skill points put into it, and Initiative is DEX plus any bonus.

(function (root) {
  const VERSION = 1;
  const STORE = 'chongkit.sheets'; // localStorage: { current, chars: { id: sheet } }

  const STATS = [
    { id: 'str', name: 'STR' }, { id: 'dex', name: 'DEX' }, { id: 'int', name: 'INT' }, { id: 'wil', name: 'WIL' },
  ];
  const SKILLS = [
    { id: 'arcana', name: 'Arcana', stat: 'int' },
    { id: 'examination', name: 'Examination', stat: 'int' },
    { id: 'finesse', name: 'Finesse', stat: 'dex' },
    { id: 'influence', name: 'Influence', stat: 'wil' },
    { id: 'insight', name: 'Insight', stat: 'wil' },
    { id: 'lore', name: 'Lore', stat: 'int' },
    { id: 'might', name: 'Might', stat: 'str' },
    { id: 'naturecraft', name: 'Naturecraft', stat: 'wil' },
    { id: 'perception', name: 'Perception', stat: 'wil' },
    { id: 'stealth', name: 'Stealth', stat: 'dex' },
  ];
  // The boxes each section shows by default (any of them can be removed and restored).
  const SECTIONS = {
    header: ['name', 'origin', 'sizeSpeed', 'heightWeight', 'hitDice'],
    stats: STATS.map((s) => s.id),
    defense: ['armor', 'initiative', 'wounds'],
    skills: SKILLS.map((s) => s.id),
  };
  // Kinds of box you can add: a number, a line of text, current/max, or (skills only) a skill.
  const BOX_TYPES = ['num', 'text', 'pair', 'skill'];
  const WOUNDS = 6; // the sheet's track: five circles and the skull

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const int = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
  const str = (v) => (v == null ? '' : String(v));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  function newBox(section, type, extra = {}) {
    const t = BOX_TYPES.includes(type) ? type : 'num';
    const box = { id: uid(), type: t, label: '', value: '' };
    if (t === 'pair') box.max = '';
    if (t === 'skill') { box.stat = 'str'; box.points = 0; delete box.value; }
    return Object.assign(box, extra);
  }

  function blank(name = '') {
    const s = {
      v: VERSION, id: uid(), name,
      ancestry: '', cls: '', level: '1', size: '', speed: '', height: '', weight: '',
      hitDice: { cur: '1', die: '' },
      hp: { cur: '', max: '', temp: '' },
      armor: '', initBonus: 0, wounds: 0, woundsMax: WOUNDS, woundMarks: [false, false, false, false, false],
      stats: {}, skills: {},
      removed: [], // default boxes taken off the sheet: `${section}:${id}`
      extras: { header: [], stats: [], defense: [], skills: [] },
      notes: '', entries: [],
    };
    STATS.forEach((st) => { s.stats[st.id] = { val: 0, key: false, save: '' }; });
    SKILLS.forEach((sk) => { s.skills[sk.id] = 0; });
    // Common extras, waiting behind the defense section's +.
    s.extras.defense.push(newBox('defense', 'pair', { label: 'Mana' }), newBox('defense', 'num', { label: 'Gold' }),
      newBox('defense', 'pair', { label: 'Inventory', max: '10' }));
    return s;
  }

  // Anything loaded (old saves, imports) is filled out to the current shape.
  function normalize(raw) {
    const s = blank();
    s.extras = { header: [], stats: [], defense: [], skills: [] };
    if (!raw || typeof raw !== 'object') return blank();
    for (const k of ['id', 'name', 'ancestry', 'cls', 'level', 'size', 'speed', 'height', 'weight', 'armor', 'notes']) {
      if (raw[k] != null) s[k] = str(raw[k]);
    }
    if (!s.id) s.id = uid();
    s.hitDice = { cur: str((raw.hitDice || {}).cur ?? '1'), die: str((raw.hitDice || {}).die) };
    s.hp = { cur: str((raw.hp || {}).cur), max: str((raw.hp || {}).max), temp: str((raw.hp || {}).temp) };
    s.initBonus = int(raw.initBonus);
    s.woundsMax = clamp(int(raw.woundsMax, WOUNDS), 1, 20);
    s.wounds = clamp(int(raw.wounds), 0, s.woundsMax);
    const marks = Array.isArray(raw.woundMarks) ? raw.woundMarks : [];
    s.woundMarks = [0, 1, 2, 3, 4].map((i) => !!marks[i]);
    for (const st of STATS) {
      const r = (raw.stats || {})[st.id] || {};
      s.stats[st.id] = { val: int(r.val), key: !!r.key, save: r.save === 'adv' || r.save === 'dis' ? r.save : '' };
    }
    for (const sk of SKILLS) s.skills[sk.id] = int((raw.skills || {})[sk.id]);
    const known = new Set(Object.entries(SECTIONS).flatMap(([sec, ids]) => ids.map((id) => `${sec}:${id}`)));
    s.removed = Array.isArray(raw.removed) ? [...new Set(raw.removed.filter((r) => known.has(r)))] : [];
    for (const sec of Object.keys(SECTIONS)) {
      const list = Array.isArray((raw.extras || {})[sec]) ? raw.extras[sec] : [];
      s.extras[sec] = list.filter((b) => b && typeof b === 'object').map((b) => {
        const box = newBox(sec, b.type);
        box.id = str(b.id) || box.id;
        box.label = str(b.label);
        if (box.type === 'skill') { box.stat = STATS.some((x) => x.id === b.stat) ? b.stat : 'str'; box.points = int(b.points); }
        else box.value = str(b.value);
        if (box.type === 'pair') box.max = str(b.max);
        return box;
      });
    }
    s.entries = (Array.isArray(raw.entries) ? raw.entries : []).filter((e) => e && typeof e === 'object')
      .map((e) => ({ id: str(e.id) || uid(), title: str(e.title), body: str(e.body) }));
    return s;
  }

  const statVal = (s, id) => (s.stats[id] ? s.stats[id].val : 0);
  const skillTotal = (s, id) => statVal(s, (SKILLS.find((k) => k.id === id) || {}).stat) + (s.skills[id] || 0);
  const boxSkillTotal = (s, box) => statVal(s, box.stat) + (box.points || 0);
  const initiative = (s) => statVal(s, 'dex') + (s.initBonus || 0);
  // Typing a total into a skill (or Initiative) keeps it tied to its stat: store the difference.
  const pointsFor = (total, stat) => int(total) - stat;

  // Click a wound circle: fill up to it, or clear it if it's the last one filled.
  const setWounds = (current, index) => (index + 1 === current ? index : index + 1);

  // Save advantage / disadvantage: one per stat, clicking the marked one clears it.
  const toggleSave = (current, which) => (current === which ? '' : which);

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
    const t = String(text).trim();
    if (t === '') return '';
    const v = evalExpr(t);
    if (v === null) return null;
    const prev = parseFloat(previous);
    if (/^[+-]/.test(t) && Number.isFinite(prev)) return String(Math.trunc(prev + v));
    return String(Math.trunc(v));
  }

  const isRemoved = (s, section, id) => s.removed.includes(`${section}:${id}`);
  function setRemoved(s, section, id, on) {
    const key = `${section}:${id}`;
    const removed = s.removed.filter((r) => r !== key);
    if (on) removed.push(key);
    return { ...s, removed };
  }

  // Undo a layout change (remove, delete, add, move): bring back the earlier layout, but keep
  // everything typed since then (boxes and entries that still exist keep their current text).
  function undoLayout(prev, cur) {
    const pick = (before, now) => before.map((b) => now.find((c) => c.id === b.id) || b);
    const out = { ...cur, removed: prev.removed.slice(), woundsMax: prev.woundsMax };
    out.wounds = Math.min(cur.wounds, out.woundsMax);
    out.extras = Object.fromEntries(Object.keys(SECTIONS).map((k) => [k, pick(prev.extras[k] || [], cur.extras[k] || [])]));
    out.entries = pick(prev.entries, cur.entries);
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

  const exportJson = (s) => JSON.stringify({ chongkitSheet: VERSION, ...s }, null, 2);
  // An imported character always gets a new id, so it never overwrites one you have.
  function importJson(text) {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || !raw.chongkitSheet) throw new Error('Not a ChongKit character');
    return { ...normalize(raw), id: uid() };
  }

  const api = {
    VERSION, STORE, STATS, SKILLS, SECTIONS, BOX_TYPES, WOUNDS, uid,
    blank, normalize, newBox, statVal, skillTotal, boxSkillTotal, initiative, pointsFor,
    setWounds, toggleSave, bloodied, evalExpr, applyMath, isRemoved, setRemoved, undoLayout, move,
    loadAll, saveAll, exportJson, importJson,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Sheet = api;
})(this);
