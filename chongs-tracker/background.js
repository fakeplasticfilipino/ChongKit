// Chong's Tracker: background page (always running while the extension is on).
// 1. Draws the badges on attached tokens: HP in the lower-left corner with Extra HP beside it, and
//    AC on a shield in the lower-right corner. They are LOCAL items (only on this screen), built
//    from the scene metadata, so hidden entries draw nothing for players and nothing extra is saved.
// 2. Adds a right-click "Track" item for tokens.
import OBR, { buildShape, buildCurve, buildText } from './vendor/obr-sdk.js';

const C = window.ChongCore;
const TAG = `${C.NS}/badge`;
const TAB_STORE = `${C.NS}/tab`;
const RED = '#e53935', BLUE = '#1e88e5', SLATE = '#546e7a', WHITE = '#ffffff', EDGE = '#111111';
// Dark outline on every badge, so they read on any map.
const outline = (d) => Math.max(1, d * 0.05);

let role = 'PLAYER';
let metadata = {};
let ready = false;

// --- Badges -----------------------------------------------------------------------
function attachedTo(builder, token, sig) {
  return builder
    .attachedTo(token.id)
    .layer('ATTACHMENT')
    .locked(true)
    .disableHit(true)
    .visible(token.visible)
    .disableAttachmentBehavior(['ROTATION', 'COPY'])
    .metadata({ [TAG]: { sig } });
}

// Centered white label over a badge.
function label(id, token, sig, center, d, text) {
  const fontSize = d * (text.length <= 2 ? 0.5 : text.length === 3 ? 0.4 : 0.32);
  return attachedTo(buildText().id(id).name("Chong's Tracker"), token, sig)
    .textType('PLAIN').plainText(text)
    .width(d * 1.6).height(d).position({ x: center.x - d * 0.8, y: center.y - d / 2 })
    .textAlign('CENTER').textAlignVertical('MIDDLE')
    .fontFamily('Roboto').fontWeight(700).fontSize(fontSize).fillColor(WHITE)
    .strokeColor(EDGE).strokeOpacity(1).strokeWidth(Math.max(0.5, d * 0.025))
    .zIndex(3).build();
}

function circle(id, token, sig, center, d, color, text) {
  return [
    attachedTo(buildShape().id(id).name("Chong's Tracker").shapeType('CIRCLE'), token, sig)
      .width(d).height(d).position(center)
      .fillColor(color).fillOpacity(1).strokeColor(EDGE).strokeOpacity(1).strokeWidth(outline(d))
      .zIndex(1).build(),
    label(`${id}.t`, token, sig, center, d, text),
  ];
}

// A heater shield, points relative to its center.
function shield(id, token, sig, center, d, color, text) {
  const w = d * 0.86, h = d;
  const pts = [
    { x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h * 0.08 },
    { x: 0, y: h / 2 }, { x: -w / 2, y: h * 0.08 },
  ];
  return [
    attachedTo(buildCurve().id(id).name("Chong's Tracker"), token, sig)
      .points(pts).position(center).closed(true).tension(0.12)
      .fillColor(color).fillOpacity(1).strokeColor(EDGE).strokeOpacity(1).strokeWidth(outline(d))
      .zIndex(1).build(),
    label(`${id}.t`, token, sig, { x: center.x, y: center.y - h * 0.08 }, d * 0.9, text),
  ];
}

// Every badge item this screen should show, keyed by id, with a signature: an item is rebuilt only
// when its signature changes. Position isn't in it: attached items follow their token.
async function desiredBadges() {
  const { entries } = C.readState(metadata);
  const shown = entries.filter((e) => e.token && C.canSee(e, role));
  if (!shown.length) return new Map();
  const tokens = new Map((await OBR.scene.items.getItems([...new Set(shown.map((e) => e.token))])).map((t) => [t.id, t]));
  const out = new Map();
  for (const e of shown) {
    const token = tokens.get(e.token);
    if (!token) continue;
    const b = await OBR.scene.items.getItemBounds([token.id]);
    const d = Math.max(16, Math.min(b.width, b.height) * 0.27);
    const base = `${C.NS}.${e.id}`;
    const add = (items, sig) => items.forEach((item) => out.set(item.id, { sig, item }));
    const y = b.max.y - d * 0.4;

    const hpCenter = { x: b.min.x + d * 0.4, y };
    const hpSig = JSON.stringify(['hp', e.hp, d, token.visible]);
    add(circle(`${base}.hp`, token, hpSig, hpCenter, d, RED, String(e.hp)), hpSig);

    if (e.extra > 0) {
      const dx = d * 0.72;
      const xpSig = JSON.stringify(['xp', e.extra, d, token.visible]);
      add(circle(`${base}.xp`, token, xpSig, { x: hpCenter.x + d * 0.5 + dx * 0.4, y: y + (d - dx) / 2 }, dx, BLUE, `+${e.extra}`), xpSig);
    }

    const ac = String(e.ac || '').trim();
    if (ac) {
      const acSig = JSON.stringify(['ac', ac, d, token.visible]);
      add(shield(`${base}.ac`, token, acSig, { x: b.max.x - d * 0.4, y }, d, SLATE, ac), acSig);
    }
  }
  return out;
}

let running = false, queued = false, timer = null;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(sync, 50);
}
async function sync() {
  if (!ready) return;
  if (running) { queued = true; return; }
  running = true;
  try {
    const want = await desiredBadges();
    const have = await OBR.scene.local.getItems((item) => item.metadata && item.metadata[TAG]);
    const keep = new Set();
    const stale = [];
    for (const item of have) {
      const w = want.get(item.id);
      if (w && w.sig === item.metadata[TAG].sig) keep.add(item.id);
      else stale.push(item.id);
    }
    const fresh = [...want.values()].filter((w) => !keep.has(w.item.id)).map((w) => w.item);
    if (stale.length) await OBR.scene.local.deleteItems(stale);
    if (fresh.length) await OBR.scene.local.addItems(fresh);
  } catch (err) {
    console.error("Chong's Tracker badges:", err);
  } finally {
    running = false;
    if (queued) { queued = false; schedule(); }
  }
}

// --- Right-click: Track ------------------------------------------------------------------
// Creates an entry for each selected token, attached to it. GMs: in the tab last open in the
// panel (hidden, like every new GM entry). Players: in the Players tab.
async function track(items) {
  const md = await OBR.scene.getMetadata();
  const { tabs, entries } = C.readState(md);
  let tab = C.PLAYERS_TAB;
  if (role === 'GM') {
    try { const t = localStorage.getItem(TAB_STORE); if (tabs.some((x) => x.id === t)) tab = t; } catch {}
  }
  const tracked = new Set(entries.map((e) => e.token));
  let order = Math.max(0, ...entries.filter((e) => e.tab === tab).map((e) => e.order + 1));
  const patch = {};
  for (const item of items) {
    if (tracked.has(item.id)) continue;
    const name = (item.text && item.text.plainText) || item.name || 'Token';
    Object.assign(patch, C.entryPatch(C.newEntry({ name, hp: 0, max: null, tab, order: order++, token: item.id })));
  }
  if (Object.keys(patch).length) await OBR.scene.setMetadata(patch);
  OBR.action.open();
}

OBR.onReady(async () => {
  role = await OBR.player.getRole();
  OBR.player.onChange((p) => { if (p.role !== role) { role = p.role; schedule(); } });

  OBR.contextMenu.create({
    id: `${C.NS}/track`,
    icons: [{
      icon: new URL('icon.svg', location.href).href,
      label: "Track in Chong's Tracker",
      filter: { every: [{ key: 'type', value: 'IMAGE' }] },
    }],
    onClick: (context) => track(context.items),
  });

  OBR.scene.onMetadataChange((md) => { metadata = md; schedule(); });
  OBR.scene.items.onChange(schedule);
  const start = async () => { ready = true; metadata = await OBR.scene.getMetadata(); schedule(); };
  OBR.scene.onReadyChange((r) => { if (r) start(); else ready = false; });
  if (await OBR.scene.isReady()) start();
});
