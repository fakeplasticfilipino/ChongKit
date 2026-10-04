// Chong's Tracker: background page (always running while the extension is on).
// 1. Draws the badges on attached tokens: small dark pills, HP in the lower-left corner (with Extra HP:
//    "8 + 2") and AC in the lower-right corner. They are LOCAL items (only on this screen), built
//    from the scene metadata, so nothing extra is saved. When an entry's stats are hidden, everyone
//    (GM too) sees H (healthy) or B (Bloodied) instead of the HP number, no Extra HP, and the AC.
// 2. Adds a right-click "Track" item for tokens.
import OBR, { buildCurve, buildText } from './vendor/obr-sdk.js';

const C = window.ChongCore;
const TAG = `${C.NS}/badge`;
const TAB_STORE = `${C.NS}/tab`;

let role = 'PLAYER';
let metadata = {};
let roomMetadata = {};
let ready = false;

// --- Badges -----------------------------------------------------------------------
// The layout (small dark pills) comes from ChongCore.badgeSpecs; this only turns it into Owlbear items.
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

function buildBadge(id, spec, origin, token, sig, z) {
  if (spec.type === 'shape') {
    return attachedTo(buildCurve().id(id).name("Chong's Tracker"), token, sig)
      .points(spec.points).position({ x: origin.x + spec.at.x, y: origin.y + spec.at.y }).closed(true).tension(0)
      .fillColor(spec.fill).fillOpacity(spec.fillOpacity)
      .strokeColor(spec.stroke).strokeOpacity(spec.strokeWidth ? 1 : 0).strokeWidth(spec.strokeWidth)
      .zIndex(z).build();
  }
  return attachedTo(buildText().id(id).name("Chong's Tracker"), token, sig)
    .textType('PLAIN').plainText(spec.text)
    .width(spec.box.w).height(spec.box.h).position({ x: origin.x + spec.box.x, y: origin.y + spec.box.y })
    .textAlign('CENTER').textAlignVertical('MIDDLE')
    .fontFamily('Roboto').fontWeight(700).fontSize(spec.fontSize).fillColor(spec.color)
    .strokeWidth(0).strokeOpacity(0)
    .zIndex(z).build();
}

// Every badge item this screen should show, keyed by id, with a signature: an item is rebuilt only
// when its pill changes. Position isn't in it (the specs are relative to the token's box):
// attached items follow their token.
async function desiredBadges() {
  const { entries } = C.readState(metadata, roomMetadata);
  // Minion groups get no badges: their HP is shared, so it lives in the panel only.
  const shown = entries.filter((e) => C.tokensOf(e).length && !e.group);
  if (!shown.length) return new Map();
  const tokens = new Map((await OBR.scene.items.getItems([...new Set(shown.flatMap(C.tokensOf))])).map((t) => [t.id, t]));
  const out = new Map();
  for (const e of shown) {
    // The first of its tokens on this map (a room entry can hold tokens from other scenes).
    const token = tokens.get(C.tokensOf(e).find((id) => tokens.has(id)));
    if (!token) continue;
    const b = await OBR.scene.items.getItemBounds([token.id]);
    const specs = C.badgeSpecs(e, b.width, b.height);
    const base = `${C.NS}.${e.id}`;
    for (const part of new Set(specs.map((x) => x.part))) {
      const mine = specs.filter((x) => x.part === part);
      const sig = JSON.stringify([token.id, token.visible, mine]);
      mine.forEach((spec, i) => out.set(`${base}.${spec.key}`, { sig, item: buildBadge(`${base}.${spec.key}`, spec, b.min, token, sig, i + 1) }));
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
  const { tabs, entries } = C.readState(md, await OBR.room.getMetadata());
  let tab = C.PLAYERS_TAB;
  if (role === 'GM') {
    try { const t = localStorage.getItem(TAB_STORE); if (tabs.some((x) => x.id === t)) tab = t; } catch {}
  }
  const tracked = new Set(entries.flatMap(C.tokensOf));
  let order = Math.max(0, ...entries.filter((e) => e.tab === tab).map((e) => e.order + 1));
  const patch = {};
  for (const item of items) {
    if (tracked.has(item.id)) continue;
    const name = (item.text && item.text.plainText) || item.name || 'Token';
    Object.assign(patch, C.entryPatch(C.newEntry({ name, hp: 0, max: null, tab, order: order++, token: item.id })));
  }
  if (Object.keys(patch).length) {
    if (tabs.find((t) => t.id === tab).room) await OBR.room.setMetadata(patch);
    else await OBR.scene.setMetadata(patch);
  }
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

  roomMetadata = await OBR.room.getMetadata();
  OBR.room.onMetadataChange((md) => { roomMetadata = md; schedule(); });
  OBR.scene.onMetadataChange((md) => { metadata = md; schedule(); });
  OBR.scene.items.onChange(schedule);
  const start = async () => { ready = true; metadata = await OBR.scene.getMetadata(); schedule(); };
  OBR.scene.onReadyChange((r) => { if (r) start(); else ready = false; });
  if (await OBR.scene.isReady()) start();
});
