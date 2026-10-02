// Chong's Tracker: pure logic (no Owlbear, no DOM), so it runs in the browser
// (as window.ChongCore) and under Node for tests (module.exports).
// System-agnostic: nothing here knows about any game's rules.

(function (root) {
  const NS = 'com.chongkit.tracker';
  const KEYS = {
    tabs: `${NS}/tabs`,
    entryPrefix: `${NS}/e/`, // one scene-metadata key per entry, so two people editing
                             // different entries never overwrite each other
  };
  const PLAYERS_TAB = 'players';
  const DEFAULT_TABS = [{ id: PLAYERS_TAB, name: 'Players' }];

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  // --- Arithmetic ---------------------------------------------------------
  // Numbers, + - * / and parentheses. No dice: the table rolls real dice.
  // Returns a number, or null if the text isn't a valid expression.
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
      if (peek() === '(') {
        i++;
        const v = expr();
        if (peek() !== ')') throw new Error(')');
        i++;
        return v;
      }
      return number();
    }
    function term() {
      let v = factor();
      while (peek() === '*' || peek() === '/') {
        const op = src[i++];
        const r = factor();
        v = op === '*' ? v * r : v / r;
      }
      return v;
    }
    function expr() {
      let v = term();
      while (peek() === '+' || peek() === '-') {
        const op = src[i++];
        const r = term();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }
    try {
      const v = expr();
      return i === src.length && Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  }

  // Read what was typed into a HP-style box.
  //   "-3" / "+5"           -> change by that much
  //   "20-3" (current 20)   -> change by -3 (you edited the number that was there)
  //   "12"                  -> set to 12
  // Fractions round toward zero (half of 15 damage is 7).
  function readInput(text, current) {
    const s = String(text).trim();
    const v = evalExpr(s);
    if (v === null) return null;
    if (/^[+-]/.test(s)) return { kind: 'delta', value: Math.trunc(v) };
    const cur = String(current);
    const rest = s.slice(cur.length).trim();
    if (current != null && s.startsWith(cur) && /^[+\-*/]/.test(rest)) {
      return { kind: 'delta', value: Math.trunc(v - current) };
    }
    return { kind: 'set', value: Math.trunc(v) };
  }

  // Apply a HP change. Damage uses up Extra HP first. When Max HP is set,
  // healing and setting can't go above it. HP may drop below 0.
  function applyHp(entry, change) {
    const before = entry.hp || 0;
    let hp = before;
    let extra = entry.extra || 0;
    const max = entry.max == null ? null : entry.max;
    if (change.kind === 'set') {
      hp = max == null ? change.value : Math.min(change.value, max);
    } else if (change.value < 0) {
      const dmg = -change.value;
      const absorbed = Math.min(extra, dmg);
      extra -= absorbed;
      hp -= dmg - absorbed;
    } else {
      // Healing stops at Max HP (and never lowers HP that was already above it).
      hp += change.value;
      if (max != null) hp = Math.min(hp, Math.max(before, max));
    }
    return { hp, extra };
  }

  // --- Batch command ----------------------------------------------------------
  //   Goblin x4 15
  //   Ogre 59 ac:M max:70 extra:5
  // or paste the ChongKit combat generator's text: every "Name xN / HP: n / Armor: X" block.
  const ARMOR_AC = { none: '', medium: 'M', heavy: 'H' };

  function parseCommand(text) {
    const src = String(text).replace(/\r\n?/g, '\n').trim();
    if (!src) return { rows: [], errors: [] };
    if (/^HP:/im.test(src)) return parseGeneratorText(src);
    const rows = [], errors = [];
    for (const line of src.split('\n').map((l) => l.trim()).filter(Boolean)) {
      const row = parseLine(line);
      if (row) rows.push(row); else errors.push(line);
    }
    return { rows, errors };
  }

  function parseLine(line) {
    const words = line.split(/\s+/);
    const row = { name: '', count: 1, hp: null, max: undefined, extra: 0, ac: '' };
    const rest = [];
    for (const w of words) {
      let m;
      if ((m = /^[x×](\d+)$/i.exec(w))) row.count = Math.max(1, Math.min(50, parseInt(m[1], 10)));
      else if ((m = /^(hp|max|extra|ac):(.+)$/i.exec(w))) {
        const key = m[1].toLowerCase(), val = m[2];
        if (key === 'ac') row.ac = val;
        else {
          const n = evalExpr(val);
          if (n === null) return null;
          if (key === 'hp') row.hp = Math.trunc(n);
          else if (key === 'max') row.max = Math.trunc(n);
          else row.extra = Math.trunc(n);
        }
      } else rest.push(w);
    }
    // Without hp:, the LAST bare number is the HP ("Goblin 2 15" = "Goblin 2" with 15 HP).
    if (row.hp === null) {
      for (let k = rest.length - 1; k > 0; k--) {
        if (/^[\d(]/.test(rest[k]) && evalExpr(rest[k]) !== null) {
          row.hp = Math.trunc(evalExpr(rest[k]));
          rest.splice(k, 1);
          break;
        }
      }
    }
    row.name = rest.join(' ');
    if (!row.name || row.hp === null) return null;
    if (row.max === undefined) row.max = row.hp;
    return row;
  }

  function parseGeneratorText(src) {
    const rows = [];
    for (const block of src.split(/\n\s*\n/)) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const hpLine = lines.find((l) => /^HP:/i.test(l));
      if (!hpLine || !lines.length) continue;
      const head = /^(.*?)\s+x(\d+)\b/i.exec(lines[0]);
      const name = (head ? head[1] : lines[0]).replace(/\s*\(.*\)\s*$/, '').trim();
      const count = head ? parseInt(head[2], 10) : 1;
      const hpText = hpLine.replace(/^HP:\s*/i, '');
      const hp = /^minion/i.test(hpText) ? 1 : parseInt(hpText, 10);
      if (!name || !Number.isFinite(hp)) continue;
      const armorLine = lines.find((l) => /^Armor:/i.test(l));
      const armor = armorLine ? armorLine.replace(/^Armor:\s*/i, '').trim() : '';
      const ac = armor.toLowerCase() in ARMOR_AC ? ARMOR_AC[armor.toLowerCase()] : armor;
      rows.push({ name, count, hp, max: hp, extra: 0, ac });
    }
    return { rows, errors: [] };
  }

  // One row "Goblin x3" -> entries "Goblin 1", "Goblin 2", "Goblin 3".
  function rowsToEntries(rows, { tab, order = 0 }) {
    const out = [];
    for (const r of rows) {
      for (let i = 1; i <= r.count; i++) {
        out.push(newEntry({
          name: r.count > 1 ? `${r.name} ${i}` : r.name,
          hp: r.hp, max: r.max, extra: r.extra, ac: r.ac,
          tab, order: order + out.length,
        }));
      }
    }
    return out;
  }

  // --- Entries ----------------------------------------------------------------
  function newEntry({ name = 'New', hp = 0, max = null, extra = 0, ac = '', tab = PLAYERS_TAB, order = 0, token = null } = {}) {
    return {
      id: uid(), tab, order, name, hp, max, extra, ac, token,
      // Entries start hidden from players, except on the Players tab.
      hidden: tab !== PLAYERS_TAB,
    };
  }

  // How full the HP bar is, 0..1. Without Max HP the bar is full.
  function hpFraction(entry) {
    if (entry.max == null || entry.max <= 0) return 1;
    return Math.max(0, Math.min(1, (entry.hp || 0) / entry.max));
  }

  // --- Scene metadata <-> state --------------------------------------------------
  function readState(metadata) {
    const md = metadata || {};
    const stored = Array.isArray(md[KEYS.tabs]) ? md[KEYS.tabs].filter((t) => t && t.id && t.id !== PLAYERS_TAB) : [];
    const tabs = [...DEFAULT_TABS, ...stored];
    const entries = [];
    for (const [k, v] of Object.entries(md)) {
      if (k.startsWith(KEYS.entryPrefix) && v && typeof v === 'object') entries.push(v);
    }
    entries.sort((a, b) => (a.order - b.order) || String(a.name).localeCompare(String(b.name)));
    return { tabs, entries };
  }

  const entryKey = (id) => KEYS.entryPrefix + id;
  const tabsPatch = (tabs) => ({ [KEYS.tabs]: tabs.filter((t) => t.id !== PLAYERS_TAB) });
  // Deleted entries are written as null (scene metadata is merged key by key).
  const entryPatch = (entry) => ({ [entryKey(entry.id)]: entry });
  const deletePatch = (id) => ({ [entryKey(id)]: null });

  // Who can see / change what.
  const canSee = (entry, role) => role === 'GM' || !entry.hidden;
  const canEdit = (entry, role) => role === 'GM' || entry.tab === PLAYERS_TAB;

  const api = {
    NS, KEYS, PLAYERS_TAB, uid,
    evalExpr, readInput, applyHp,
    parseCommand, rowsToEntries,
    newEntry, hpFraction,
    readState, entryKey, tabsPatch, entryPatch, deletePatch, canSee, canEdit,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ChongCore = api;
})(this);
