// Chong's Tracker: pure logic (no Owlbear, no DOM), so it runs in the browser
// (as window.ChongCore) and under Node for tests (module.exports).
// System-agnostic: nothing here knows about any game's rules.

(function (root) {
  const NS = 'com.chongkit.tracker';
  const KEYS = {
    tabs: `${NS}/tabs`, // old: every tab in one key (read once, then moved to tabPrefix keys)
    tabPrefix: `${NS}/t/`, // one key per tab, so a player and the GM adding tabs don't clash
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
  //   Kobold Minion x10    (a name with "minion" in it: ONE entry whose HP is the number of minions)
  // or paste the ChongKit combat generator's text: every "Name xN / HP: n / Armor: X" block.
  // ac: and Armor: keep a word's first letter (Medium -> M, Heavy -> H; None -> no AC).
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
        if (key === 'ac') row.ac = acFrom(val);
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
    // Minions die to any damage, so a group shares one entry: HP = how many are left.
    if (rest.some((w) => /^minions?$/i.test(w))) {
      if (row.count > 1 || row.hp === null) row.hp = row.count;
      row.count = 1;
      row.group = true;
      row.max = row.hp;
    }
    if (!row.name || row.hp === null) return null;
    if (row.max === undefined) row.max = row.hp;
    return row;
  }

  // Each block with an "HP:" line is a monster. Its other lines (Damage, Save DC, Move, abilities)
  // become the entry's note; blocks without a monster (the fight's title, twist, traits, loot) become
  // the tab's general note.
  function parseGeneratorText(src) {
    const rows = [], general = [];
    for (const block of src.split(/\n\s*\n/)) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) continue;
      const hpLine = lines.find((l) => /^HP:/i.test(l));
      if (!hpLine) { general.push(lines.join('\n')); continue; }
      const head = /^(.*?)\s+x(\d+)\b/i.exec(lines[0]);
      const name = (head ? head[1] : lines[0]).replace(/\s*\(.*\)\s*$/, '').trim();
      const count = head ? parseInt(head[2], 10) : 1;
      const hpText = hpLine.replace(/^HP:\s*/i, '');
      const minion = /^minion/i.test(hpText);
      const hp = minion ? count : parseInt(hpText, 10);
      if (!name || !Number.isFinite(hp)) { general.push(lines.join('\n')); continue; }
      const armorLine = lines.find((l) => /^Armor:/i.test(l));
      const ac = armorLine ? acFrom(armorLine.replace(/^Armor:\s*/i, '')) : '';
      const row = { name, count: minion ? 1 : count, hp, max: hp, extra: 0, ac };
      if (minion) row.group = true;
      const note = lines.slice(1).filter((l) => l !== hpLine && l !== armorLine).join('\n');
      if (note) row.note = note;
      rows.push(row);
    }
    const out = { rows, errors: [] };
    if (general.length) out.note = general.join('\n\n');
    return out;
  }

  // Armor written as a word keeps its first letter ("Medium" -> M); "None" means no AC; numbers stay as typed.
  function acFrom(text) {
    const t = String(text).trim();
    if (/^none$/i.test(t)) return '';
    return /^[a-z]/i.test(t) ? t[0].toUpperCase() : t;
  }

  // A pasted general note goes under the tab's note (unless it's already there).
  function addNote(note, more) {
    const a = String(note || '').trim(), b = String(more || '').trim();
    if (!b || a.includes(b)) return a;
    return a ? `${a}\n\n${b}` : b;
  }

  // One row "Goblin x3" -> entries "Goblin 1", "Goblin 2", "Goblin 3".
  function rowsToEntries(rows, { tab, order = 0, hidden }) {
    const out = [];
    for (const r of rows) {
      for (let i = 1; i <= r.count; i++) {
        out.push(newEntry({
          name: r.count > 1 ? `${r.name} ${i}` : r.name,
          hp: r.hp, max: r.max, extra: r.extra, ac: r.ac, note: r.note,
          tab, order: order + out.length, hidden, group: !!r.group,
        }));
      }
    }
    return out;
  }

  // --- Entries ----------------------------------------------------------------
  // hidden = the stats are hidden from players: they see the entry, its AC, and H or B instead of
  // its HP. New entries start hidden, except on the Players tab (or another players' tab).
  // group = minions sharing this entry: picking tokens attaches all of them to it.
  // note = free text kept with the entry (damage, save DC, abilities...).
  function newEntry({ name = 'New', hp = 0, max = null, extra = 0, ac = '', note = '', tab = PLAYERS_TAB, order = 0, token = null, hidden, group = false } = {}) {
    const e = {
      id: uid(), tab, order, name, hp, max, extra, ac, token, tokens: token ? [token] : [],
      hidden: hidden === undefined ? tab !== PLAYERS_TAB : !!hidden,
    };
    if (group) e.group = true;
    if (note) e.note = note;
    return e;
  }

  // An entry can hold several tokens (minions). `token` stays the first one: it gets the badges.
  const tokensOf = (e) => (Array.isArray(e.tokens) ? e.tokens : e.token ? [e.token] : []);
  const withTokens = (e, list) => {
    const tokens = [...new Set(list)];
    return { ...e, tokens, token: tokens[0] || null };
  };

  // Move one id before or after another: the new order of ids.
  function reorder(ids, fromId, toId, after) {
    const out = ids.filter((id) => id !== fromId);
    const at = out.indexOf(toId);
    if (at < 0 || fromId === toId) return ids.slice();
    out.splice(after ? at + 1 : at, 0, fromId);
    return out;
  }

  // H (healthy) or B (Bloodied: at or below half Max HP, or at 0 or less).
  function hpStatus(entry) {
    const hp = entry.hp || 0;
    if (hp <= 0) return 'B';
    return entry.max != null && entry.max > 0 && hp <= entry.max / 2 ? 'B' : 'H';
  }

  // "/clear" (every entry in the tab) or "/clear Goblin" (names starting with Goblin). GM only.
  function parseClear(text) {
    const m = /^\/(clear|delete)(?:\s+(.*))?$/i.exec(String(text).trim());
    return m ? { match: (m[2] || '').trim() } : null;
  }
  const clearMatches = (entry, clear) => !clear.match || String(entry.name).toLowerCase().startsWith(clear.match.toLowerCase());

  // How full the HP bar is, 0..1. Without Max HP the bar is full.
  function hpFraction(entry) {
    if (entry.max == null || entry.max <= 0) return 1;
    return Math.max(0, Math.min(1, (entry.hp || 0) / entry.max));
  }

  // --- Metadata <-> state ----------------------------------------------------------
  // A tab may carry a general note (`note`: free text shown at the top of the tab).
  // Tabs live in the scene's metadata, except tabs saved to the room (room: true), which live in the
  // room's metadata with their entries so they show in every scene. The Players tab is always there;
  // a `t/players` key in the room's metadata only marks it as saved to the room.
  function readTabs(md, byId, room) {
    if (!room) {
      const legacy = Array.isArray(md[KEYS.tabs]) ? md[KEYS.tabs] : [];
      legacy.forEach((t, i) => { if (t && t.id && t.id !== PLAYERS_TAB) byId.set(t.id, { order: i + 1, ...t }); });
    }
    for (const [k, v] of Object.entries(md)) {
      if (!k.startsWith(KEYS.tabPrefix)) continue;
      const id = k.slice(KEYS.tabPrefix.length);
      if (v && typeof v === 'object' && id !== PLAYERS_TAB) byId.set(id, room ? { ...v, id, room: true } : { ...v, id });
      else if (!room) byId.delete(id); // a deleted room key leaves the scene's copy alone
    }
  }
  function readState(sceneMetadata, roomMetadata) {
    const md = sceneMetadata || {}, rmd = roomMetadata || {};
    const byId = new Map();
    readTabs(md, byId, false);
    readTabs(rmd, byId, true); // a room tab wins over a scene copy left behind mid-move
    // The Players tab's own keys only carry its note (and, in the room, mark it as saved there).
    const players = { ...DEFAULT_TABS[0] };
    const ps = md[KEYS.tabPrefix + PLAYERS_TAB], pk = rmd[KEYS.tabPrefix + PLAYERS_TAB];
    if (ps && typeof ps === 'object' && ps.note) players.note = ps.note;
    if (pk && typeof pk === 'object') { players.room = true; if (pk.note) players.note = pk.note; }
    const tabs = [players, ...[...byId.values()].sort((a, b) => (a.order || 0) - (b.order || 0))];
    const roomTab = new Set(tabs.filter((t) => t.room).map((t) => t.id));
    // An entry is read from both places; mid-move it can be in both: keep the copy that sits where
    // its tab is saved.
    const found = new Map();
    for (const [src, room] of [[md, false], [rmd, true]]) {
      for (const [k, v] of Object.entries(src)) {
        if (!k.startsWith(KEYS.entryPrefix) || !v || typeof v !== 'object') continue;
        const had = found.get(v.id);
        if (!had || roomTab.has(v.tab) === room) found.set(v.id, v);
      }
    }
    const entries = [...found.values()];
    entries.sort((a, b) => (a.order - b.order) || String(a.name).localeCompare(String(b.name)));
    return { tabs, entries };
  }

  const entryKey = (id) => KEYS.entryPrefix + id;
  // `room` isn't saved: it's where the tab is saved.
  const tabPatch = (tab) => { const { room, ...t } = tab; return { [KEYS.tabPrefix + tab.id]: t }; };
  const tabDeletePatch = (id) => ({ [KEYS.tabPrefix + id]: null });
  // Moves tabs from the old single key to one key per tab (null when there's nothing to move).
  function migrateTabsPatch(md) {
    if (!md || md[KEYS.tabs] == null) return null;
    const patch = { [KEYS.tabs]: null };
    for (const t of readState(md).tabs) if (t.id !== PLAYERS_TAB && !((KEYS.tabPrefix + t.id) in md)) Object.assign(patch, tabPatch(t));
    return patch;
  }
  // Deleted entries are written as null (metadata is merged key by key).
  const entryPatch = (entry) => ({ [entryKey(entry.id)]: entry });
  const deletePatch = (id) => ({ [entryKey(id)]: null });

  // Saving a tab to the room (or back to the scene): the patch to write where it goes and the one
  // that clears where it was. Back in the scene, it's only in the current scene.
  function moveTabPatches(tab, entries, toRoom) {
    const to = {}, from = {};
    if (tab.id !== PLAYERS_TAB || toRoom || tab.note) Object.assign(to, tabPatch(tab));
    Object.assign(from, tabDeletePatch(tab.id));
    for (const e of entries) if (e.tab === tab.id) { Object.assign(to, entryPatch(e)); Object.assign(from, deletePatch(e.id)); }
    return { to, from };
  }
  // Owlbear's room metadata holds 16 kB in all, shared with every extension.
  const ROOM_LIMIT = 16 * 1024;
  const metadataSize = (md) => new TextEncoder().encode(JSON.stringify(md || {})).length;

  // Who can see / change what. Everyone sees every entry; players see H/B for hidden stats.
  // Players' tabs (the Players tab, and any tab a player made) can be edited by players.
  const isPlayerTab = (tab) => !!tab && (tab.id === PLAYERS_TAB || !!tab.players);
  const masked = (entry, role) => role !== 'GM' && !!entry.hidden;
  const canEdit = (entry, role, tabs) => role === 'GM' || (!masked(entry, role) && isPlayerTab((tabs || DEFAULT_TABS).find((t) => t.id === entry.tab)));

  // --- Token badges -----------------------------------------------------------------
  // Small dark pills in the token's lower corners: HP (with Extra HP: "8 + 2") on the left, AC on
  // the right. Laid out against a token box of w x h with its top-left at 0,0; the background page
  // offsets them to the token. Shapes are closed polygons (points relative to `at`); text sits in a
  // box. `part` groups each pill's pieces (hp, ac).
  const BADGE = {
    fill: '#161821', fillOpacity: 0.86, text: '#ffffff',
    hp: '#ef5350', healthy: '#66bb6a', bloodied: '#ef5350', bloodiedFill: '#6d1414', ac: '#b0bec5',
  };

  // A rounded rectangle centered on 0,0, as polygon points (a few per corner).
  function roundRect(w, h, r, steps = 4) {
    r = Math.min(r, w / 2, h / 2);
    const pts = [];
    const corners = [[w / 2 - r, -h / 2 + r, -90], [w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180]];
    for (const [cx, cy, start] of corners) {
      for (let i = 0; i <= steps; i++) {
        const a = (start + (90 * i) / steps) * Math.PI / 180;
        pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
      }
    }
    return pts;
  }

  function badgeSpecs(entry, w, h) {
    const H = Math.max(14, Math.min(28, Math.min(w, h) * 0.17)); // pill height: grows with the token, within limits
    const font = H * 0.6;
    const pad = H * 0.38, inset = H * 0.12, gap = H * 0.18;
    const stroke = Math.max(1, H * 0.07);
    const width = (t) => Math.max(H * 1.5, String(t).length * font * 0.58 + pad * 2);
    const rowY = (row) => h - inset - H / 2 - row * (H + gap); // pill centers; row 0 is the bottom
    const out = [];
    function pill(part, left, pw, row, t, edge, fill = BADGE.fill) {
      out.push({ part, key: part, type: 'shape', at: { x: left + pw / 2, y: rowY(row) }, points: roundRect(pw, H, H / 2),
        fill, fillOpacity: fill === BADGE.fill ? BADGE.fillOpacity : 0.94, stroke: edge, strokeWidth: stroke });
      out.push({ part, key: `${part}.t`, type: 'text', box: { x: left, y: rowY(row) - H / 2, w: pw, h: H }, text: String(t), fontSize: font, color: BADGE.text });
    }

    const mask = !!entry.hidden;
    const st = mask ? hpStatus(entry) : null;
    const hpText = mask ? st : entry.extra > 0 ? `${entry.hp || 0} + ${entry.extra}` : String(entry.hp || 0);
    const hpW = width(hpText);
    pill('hp', inset, hpW, 0, hpText, mask ? (st === 'B' ? BADGE.bloodied : BADGE.healthy) : BADGE.hp, st === 'B' ? BADGE.bloodiedFill : BADGE.fill);

    // AC in the other corner; up a row when it would run into the HP pill.
    const ac = String(entry.ac || '').trim();
    if (ac) {
      const aw = width(ac);
      const left = w - inset - aw;
      const row = inset + hpW + gap <= left ? 0 : 1;
      pill('ac', row ? Math.max(inset, left) : left, aw, row, ac, BADGE.ac);
    }
    return out;
  }

  // Dice rolls in note text, for clicking them into Chong Die. A roll is a dice term (`1d8`, `d20`,
  // `d%`, with Avrae ops like `!`, `kh1`, `rr<2`) followed by more dice or numbers joined by + / -.
  // A repeat like `(2×)` or `(2x)` before it makes it `!rr 2 …` (one roll per attack), but only for
  // the first roll after the marker: "Ravage (2×). 1d10. OR: Shoot. 1d10." rolls the Shoot once.
  const DICE_TERM = String.raw`\d*d(?:\d+|%)(?:!|(?:kh|kl|ph|pl|rr|ro|ra|mi|ma|k|p|e)[<>]?\d+)*`;
  const ROLL_RE = new RegExp(String.raw`(?<![\w!.%])${DICE_TERM}(?:[+-](?:${DICE_TERM}|\d+(?!\w)))*(?![\w%!])`, 'g');
  const REPEAT_RE = /\((\d+)\s*[×x]\)/g;

  function findRolls(line) {
    const text = String(line || '');
    const rolls = [];
    let from = 0; // repeat markers before this point belong to an earlier roll
    for (const m of text.matchAll(ROLL_RE)) {
      let times = 1;
      for (const r of text.slice(from, m.index).matchAll(REPEAT_RE)) times = Number(r[1]);
      from = m.index + m[0].length;
      const expr = m[0];
      rolls.push({
        start: m.index,
        end: m.index + expr.length,
        command: times > 1 ? `!rr ${times} ${expr}` : `!r ${expr}`,
      });
    }
    return rolls;
  }

  const api = {
    NS, KEYS, PLAYERS_TAB, uid, findRolls,
    evalExpr, readInput, applyHp,
    parseCommand, rowsToEntries, acFrom, addNote,
    newEntry, hpFraction, hpStatus, parseClear, clearMatches, tokensOf, withTokens, reorder,
    readState, entryKey, tabPatch, tabDeletePatch, migrateTabsPatch, entryPatch, deletePatch, moveTabPatches,
    ROOM_LIMIT, metadataSize, isPlayerTab, masked, canEdit,
    BADGE, badgeSpecs,
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ChongCore = api;
})(this);
