# Chong Die 2.1: one window, docked Rolls panel (design)

Date: 2026-10-07 · Status: **historical** (v2.1; the current design is in `chong-die-src/DESIGN.md`) · Replaced the two-window split
(`2026-10-07-chong-die-split-windows-design.md`): in Owlbear the separate tray popover never appeared.

## Layout

The toolbar button opens one window (`index.html`, the action popover, manifest 375 × 700):

```
┌──────┬──────────────────────┬────────────────────────────┐
│ side │                      │ [ !r 1d20+5            ]   │
│ bar  │      3D tray         │ Rolls  Spells  +   ⚡ + ⋯  │
│      │  (stock look, no     │────────────────────────────│
│  ▤   │   command line)      │ (Longsword 1d20+5) (…)     │
└──────┴──────────────────────┴────────────────────────────┘
                                ← Rolls panel, 300 px, only when open
```

- Width = `innerHeight / 2 + 60` (sidebar + tray, as upstream) `+ 300` when the panel is open, set with
  `OBR.action.setWidth`. Closed, the window is exactly stock Owlbear Dice.
- ▤ in the sidebar opens / closes the panel (pressed while open). The choice is remembered in prefs
  (`panelOpen`, default `true`).
- The panel is the v2 Rolls UI: command line (typo check, ↑/↓ history of typed commands), tab row with
  ⚡ Instant, + add roll, ⋯ (Nimble rules, export / import, About), pills. No 🎲 button.
- The panel stays open after rolling (it covers nothing).

## Rolling

- Command line: `startCommandRoll` on the tray now. Pills: Instant → roll now; otherwise `placeCommand`
  (a command with only virtual dice rolls). Same window, no messages.
- Chong's Tracker: background acks `…/roll`, `OBR.action.open()`, re-sends `…/run` until `…/run-ack`
  (the v1 path that works in Owlbear). Optional `place` and the saved `activeTabId` stay.
- Another player's roll popover → `OBR.action.open()` (upstream).

## Kept from 2.0

Split stores (`chongStore` saved rolls / `trayStore` / `prefsStore`), tray error banner, history only
for typed commands, `readRollMessage`, `instantFor`.

## Removed

`tray.html`, `src/rolls.tsx`, `RollsApp`, `trayWindow.ts` (+ test), `TrayToggle`, `CloseTray`,
`sendRoll` (+ test). Manifest back to 375 × 700.

## Testing

Vitest: prefs load/save `panelOpen` (default true, bad values → true); `windowWidth(height, panelOpen)`;
`runPill` (Instant rolls, otherwise places; only virtual dice rolls). Browser: open and closed layouts,
pill roll on the tray, typo error. Build; version **2.1.0**; docs (CLAUDE.md, README, NOTICE, trackers).
