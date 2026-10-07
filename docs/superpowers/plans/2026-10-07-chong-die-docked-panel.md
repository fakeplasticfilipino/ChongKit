# Chong Die 2.1 docked panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the v2 Rolls UI back into the tray window as a panel docked to the right.

**Architecture:** One action popover: `Sidebar | InteractiveTray | RollPanel?`. Width from a pure `windowWidth`. Panel rolls in-window; tracker rolls via background → `OBR.action.open()` → `…/run`.

**Tech Stack:** React 18, MUI, zustand, Owlbear SDK 3.x, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-07-chong-die-docked-panel-design.md`

## Global Constraints

- Panel width 300 px; window width `innerHeight / 2 + 60 (+ 300)`; manifest 375 × 700; version `2.1.0`.
- `panelOpen` in prefs (`chongkit.chongdie.prefs`), default `true`.
- Commit straight to `main`; rebuild and commit `chong-die/`; NOTICE.md lists the change.

## Review Focus

- Prefs saved by 2.0 (no `panelOpen`): panel opens (Task 1 test).
- A pill in a Place tab with only virtual dice (`1d7`): rolls (Task 2 test).
- Tracker roll with the window closed: action opens, roll runs (Owlbear check, TRACKER.md).
- Window resized by Owlbear: width keeps the panel (ResizeObserver depends on `panelOpen`).
- Panel closed while a Place is pending: dice stay placed (no change to tray state).

---

### Task 1: Prefs and window width

**Files:** Modify `src/chong/prefs.ts`, `prefs.test.ts`, `prefsStore.ts`; Create `src/chong/layout.ts`, `layout.test.ts`.

**Interfaces:** Produces `Prefs.panelOpen: boolean`; `usePrefsStore.setPanelOpen(open: boolean)`; `PANEL_WIDTH = 300`, `SIDEBAR_WIDTH = 60`, `windowWidth(height: number, panelOpen: boolean): number`.

- [ ] Tests: default prefs `{ primaryStyle: null, nimble: false, panelOpen: true }`; `panelOpen: false` round-trips; `"no"` → true; `windowWidth(700, false) === 410`, `windowWidth(700, true) === 710`.
- [ ] Run: fail. Implement. Run: pass. Commit.

### Task 2: Docked panel in the tray window

**Files:** Modify `App.tsx`, `controls/Sidebar.tsx`, `plugin/ResizeObserver.tsx`, `chong/RollPanel.tsx`, `chong/CommandLine.tsx`, `background.ts`, `plugin/PopoverTrays.tsx`, `public/manifest.json`, `vite.config.ts`, `index.html`?; Create `chong/PanelToggle.tsx`, `chong/runPill.ts`, `runPill.test.ts`; Delete `tray.html`, `src/rolls.tsx`, `chong/RollsApp.tsx`, `chong/trayWindow.ts(+test)`, `chong/TrayToggle.tsx`, `chong/CloseTray.tsx`, `chong/sendRoll.ts(+test)`.

**Interfaces:** `runPill(command: string, instant: boolean, hidden: boolean): "rolled" | "placed"` (throws `RollError`).

- [ ] Tests (`runPill.test.ts`): instant → rolled (roll in dice store); not instant → placed (`useTrayStore.placed`); not instant + `1d7` → rolled.
- [ ] Run: fail. Implement `runPill`; pill click uses it (errors → `chongStore.setError`).
- [ ] CommandLine: `startCommandRoll(command, { hidden })` instead of `sendRoll`; error from `startCommandRoll` shown too.
- [ ] App: `Sidebar | InteractiveTray | {panelOpen && <RollPanel/>}` (panel: 300 px, full height, left border, paper bg, column `CommandLine` + row + pills). RollPanel drops `TrayToggle`.
- [ ] Sidebar: `PanelToggle` (▤, pressed while open, `setPanelOpen`); remove `CloseTray`. `listenForPrefChanges` moves to an effect in `IncomingRolls`.
- [ ] ResizeObserver: `OBR.action.setWidth(windowWidth(innerHeight, panelOpen))`, re-run when `panelOpen` changes.
- [ ] Background + PopoverTrays: `OBR.action.open()` (no `openTray`). Vite input: drop `tray`; `index.html` → `/src/main.tsx`. Manifest 375 × 700, `2.1.0`. Delete the removed files.
- [ ] Tests + tsc pass; build; browser check open/closed layouts, pill rolls, typo error. Commit.

### Task 3: Release

- [ ] CLAUDE.md (Chong Die section: one window, docked panel), README, NOTICE.md, `chong-die/TRACKER.md` (v2.1.0 + Owlbear checks), root TRACKER.md. All tests; build; commit; pull --rebase; push.
