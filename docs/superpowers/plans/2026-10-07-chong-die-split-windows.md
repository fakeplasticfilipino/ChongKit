# Chong Die Rolls window + stock tray Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Chong Die into a Rolls window (toolbar button: command line, tabs, pills) and a stock-looking dice tray opened as a second popover.

**Architecture:** One extension, three pages: `index.html` (Rolls window, action popover), `tray.html` (the tray, `OBR.popover.open`), `background.html`. Every roll, from the Rolls window or Chong's Tracker, goes `…/roll` → background → opens the tray if closed → `…/run` until acked. Stores split so only the Rolls window writes saved rolls.

**Tech Stack:** React 18, MUI, zustand + immer, three.js, Owlbear SDK 3.x, Vite, Vitest (node env).

**Spec:** `docs/superpowers/specs/2026-10-07-chong-die-split-windows-design.md`

## Global Constraints

- Paths: all under `chong-die-src/`. Run tests `npx yarn@1.22.22 test`, build `npx yarn@1.22.22 build` (from `chong-die-src/`).
- Plugin id prefix `com.chongkit.chongdie/`; channel names in `src/chong/channels.ts` unchanged.
- Manifest: version `2.0.0`, action `width: 520`, `height: 640`.
- Tray popover: id `com.chongkit.chongdie/tray`, url `/ChongKit/chong-die/tray.html`, height 700 (clamped to viewport), width `innerHeight / 2 + 60`, `disableClickAway: true`, top-right.
- `place` in roll messages is optional; Chong's Tracker is not changed.
- Only the Rolls window writes `chongkit.chongdie`. Prefs stay in `chongkit.chongdie.prefs`.
- Owlbear look (upstream MUI theme). No nimble.css. Rebuild and commit `chong-die/` at the end; list changes in `NOTICE.md`.
- Commit straight to `main` with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; pull --rebase before pushing.

## Review Focus

- Tracker click while the tray is already open mid-roll: the tray must not reload (Task 3 test: `openTray` doesn't call `popover.open` when open).
- Saved data with an `activeTabId` of a deleted tab: falls back to the first tab (Task 1 test).
- A roll message with `place` of the wrong type (`"yes"`): treated as missing, not as true (Task 3 test).
- Nimble switched in the Rolls window while the tray is open: hand-picked dice follow it (Task 2 test: `reload` reads new prefs).
- Rolls window typing while the tray window is closed and the pill/command is invalid: nothing sent, error shown (Task 5 browser check).

---

### Task 1: Saved active tab

**Files:** Modify `src/chong/savedRolls.ts`, `src/chong/chongStore.ts`; Test `src/chong/savedRolls.test.ts`

**Interfaces:**
- Produces: `SavedRolls.activeTabId?: string`; `instantFor(saved: SavedRolls): boolean` (active tab's `instant`, first tab when the id is missing or unknown).

- [ ] Tests: `validateSavedRolls` keeps `activeTabId` when it names a tab, drops it otherwise; `instantFor` returns the active tab's instant and the first tab's when the id is unknown.
- [ ] Run: fail.
- [ ] Implement in `savedRolls.ts`. In `chongStore`: initial `activeTabId = initial.activeTabId ?? initial.tabs[0].id`; the subscriber saves `{ ...state.saved, activeTabId: state.activeTabId }` when `saved` or `activeTabId` changed.
- [ ] Run: pass. Commit.

### Task 2: Store split (prefs, tray, Rolls window)

**Files:** Create `src/chong/prefsStore.ts`, `src/chong/trayStore.ts`, `src/chong/prefsStore.test.ts`; Modify `chongStore.ts`, `rollRunner.ts`, `place.ts`, `controls/store.ts`, `controls/DiceRollControls.tsx`, `PrimaryDiePicker.tsx`, `MoreMenu.tsx`, tests `place.test.ts`, `rollRunner.test.ts`.

**Interfaces:**
- Produces: `usePrefsStore` `{ prefs: Prefs; setPrimaryStyle(s: DiceStyle | null); setNimble(on: boolean); reload(storage?: Storage) }` (saves on change; `listenForPrefChanges(): () => void` adds a `storage` listener for `PREFS_KEY` that calls `reload()`).
- Produces: `useTrayStore` `{ placed: string | null; error: string | null; setPlaced; setError }`.
- `useChongStore` keeps `saved, activeTabId, error, draft` and tab/pill actions + `recordHistory`, `replaceSaved`; loses `prefs, placed, panelOpen` and their setters.

- [ ] Tests: `prefsStore.test.ts` — `reload(fake)` after `savePrefs({primaryStyle:"SUNSET", nimble:true}, fake)` gives those prefs; `rollRunner.test.ts` — `startCommandRoll("1d20")` leaves `useChongStore.getState().saved.history` unchanged. Move existing `placed`/prefs test calls to the new stores.
- [ ] Run: fail.
- [ ] Implement; `startCommandRoll` no longer calls `recordHistory`; tray-side code uses `useTrayStore`/`usePrefsStore`.
- [ ] Run all tests + `npx tsc --noEmit`: pass. Commit.

### Task 3: Roll path (`place`, tray window, background)

**Files:** Create `src/chong/trayWindow.ts`, `src/chong/trayWindow.test.ts`; Modify `channels.ts`, `incoming.ts`, `incoming.test.ts`, `IncomingRolls.tsx`, `background.ts`, `plugin/PopoverTrays.tsx`.

**Interfaces:**
- Produces: `RollMessage { id: string; command: string; place?: boolean }`; `readRollMessage(data: unknown): RollMessage | null` (in `channels.ts`; drops a non-boolean `place`).
- Produces: `handleIncomingRoll(command: string, place?: boolean, saved = loadSaved()): "rolled" | "placed" | "error"` — `place ?? !instantFor(saved)`; errors to `useTrayStore`.
- Produces: `TRAY_ID`, `isTrayOpen(): Promise<boolean>` (`popover.getWidth(TRAY_ID) !== undefined`), `openTray(): Promise<void>` (no-op when open), `closeTray(): Promise<void>`.

- [ ] Tests: `readRollMessage({id:"a",command:"1d6",place:"yes"})` → `{id:"a",command:"1d6"}`; incoming: `place: true` places on an instant tab, `place: false` rolls on a place tab, missing `place` follows `saved` (`instant: false` → placed); trayWindow (mock `@owlbear-rodeo/sdk`): open tray → `popover.open` not called; closed → called once with `id: TRAY_ID`, `disableClickAway: true`.
- [ ] Run: fail.
- [ ] Implement. Background: `readRollMessage`, ack, `openTray()` (was `OBR.action.open()`), forward the message with `place`. `IncomingRolls` passes `msg.place`. `PopoverTrays.handleTrayOpen`: `openTray()` then post `focused-tray` now and again after 1500 ms (a fresh tray is still loading).
- [ ] Run: pass. Commit.

### Task 4: Tray window

**Files:** Create `tray.html`, `src/chong/TrayError.tsx`, `src/chong/CloseTray.tsx`; Modify `vite.config.ts` (input `tray`), `src/tray/InteractiveTray.tsx`, `src/controls/Sidebar.tsx`, `src/plugin/ResizeObserver.tsx`; Delete `src/chong/PanelToggle.tsx`.

- [ ] `tray.html` = today's `index.html` (title "Chong Die", `/src/main.tsx`).
- [ ] `InteractiveTray`: upstream body (`<DiceRollControls />` directly, no offset box), plus `<TrayError />` (absolute top banner from `useTrayStore.error`, cleared by the next successful roll); remove `CommandLine`, `RollPanel`.
- [ ] Sidebar: remove `PanelToggle`; `PrimaryDiePicker` reads `usePrefsStore`; `CloseTray` (× icon button, tooltip "Close", `closeTray()`) at the bottom inside `PluginGate`; call `listenForPrefChanges` once (effect in `CloseTray`'s gate sibling or `IncomingRolls`).
- [ ] ResizeObserver: `OBR.popover.setWidth(TRAY_ID, innerHeight / 2 + 60)`.
- [ ] Tests + tsc pass; `vite build` succeeds. Commit.

### Task 5: Rolls window

**Files:** Create `src/rolls.tsx`, `src/chong/RollsApp.tsx`, `src/chong/sendRoll.ts`, `src/chong/TrayToggle.tsx`; Modify `index.html` (title "Chong Die", `/src/rolls.tsx`), `CommandLine.tsx`, `RollPanel.tsx`, `incoming.ts` if needed, `public/manifest.json` (520 × 640).

**Interfaces:**
- Produces: `sendRoll(command: string, place: boolean): void` — LOCAL broadcast on `CHANNELS.roll` with a fresh id (no-op outside Owlbear).

- [ ] `RollsApp`: full-height column: `CommandLine` (static, not absolute; no rolling fade; no PanelToggle), a row `TabStrip` + Instant + Add roll + `TrayToggle` + `MoreMenu`, then `PillList` filling the rest; `PillDialog` as now. Theme providers like `main.tsx`; `listenForPrefChanges` in an effect.
- [ ] Command line Enter: `parseCommand` (error → shown, not sent), else `sendRoll(text, false)`, `recordHistory`, clear. Pill click: `pillError` → shown; else `sendRoll(pill.command, !tab.instant)`.
- [ ] `TrayToggle`: dice icon, pressed when `isTrayOpen()` (polled every 1000 ms inside Owlbear); click toggles `openTray`/`closeTray`.
- [ ] Delete dead code: `panelOpen`, `COMMAND_LINE_HEIGHT` exports, Slide overlay.
- [ ] Tests + tsc pass. Browser check (`vite` dev server): `index.html` lays out at 520 × 640 (tabs, pills, error on `1d0`), `tray.html` shows the stock tray with no command line. Commit.

### Task 6: Release

- [ ] Manifest `2.0.0`; `NOTICE.md` (two windows); `chong-die/TRACKER.md` (v2.0.0 done + Owlbear checks: tray opens/doesn't reload, tracker roll with tray closed/open, party-tray click, Nimble while tray open, `popover.getWidth` on a closed popover returns undefined); `CLAUDE.md` Chong Die section; `README.md` Chong Die usage.
- [ ] `npx yarn@1.22.22 test`, build, root `node --test …`; commit `chong-die/` + docs; pull --rebase; push.
