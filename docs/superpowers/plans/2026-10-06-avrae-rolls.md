# Avrae Version, Clickable Rolls, Simpler Chong Die Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Combat Generator's Avrae Version option, make dice in Chong's Tracker notes clickable rolls that go to Chong Die, and simplify Chong Die's panel controls with richer pills.

**Architecture:** Pure text logic lives where each tool keeps its tested logic (`generator.js`, `core.js`, `src/chong/`). The tracker sends a LOCAL Owlbear broadcast; Chong Die's background page acknowledges it, opens the dice window and forwards the command; the window rolls or places it by its open tab's Instant switch.

**Tech Stack:** Vanilla JS + node:test (generator, tracker), React/TypeScript + Vitest + Vite (Chong Die), Owlbear SDK (vendored 3.x in the tracker; npm in Chong Die, upgraded 1.3.9 → 3.x).

**Spec:** `docs/superpowers/specs/2026-10-06-avrae-rolls-design.md`

## Global Constraints

- Option label exactly `Avrae Version`; checkbox id `avrae`, after Loot, saved in `CHECKS`.
- Channels: tracker → Chong Die `com.chongkit.chongdie/roll` (data `{ id, command }`), Chong Die → tracker `com.chongkit.chongdie/ack` (`{ id }`), background → window `com.chongkit.chongdie/run` (`{ id, command }`), window → background `com.chongkit.chongdie/run-ack` (`{ id }`). All `{ destination: "LOCAL" }`.
- Tracker waits 1 s for an ack, then `OBR.notification.show("Install Chong Die to roll")`. Background re-sends `run` every 250 ms for up to 3 s until `run-ack`.
- Tracker: bump `manifest.json` `version` (1.7.1 → 1.8.0) and every `?v=` in `index.html` and `background.html`.
- Chong Die: version 1.1.0 in `chong-die-src/public/manifest.json`; rebuild and commit `chong-die/`.
- User text only ever as text nodes / `textContent` (tracker) and React text (Chong Die).
- Generator ground rules: dice unchanged → averages unchanged; README marks the `!` notation as derived.
- Commands: tracker/generator tests `node --test combat-generator/tests/*.test.js chongs-tracker/tests/*.test.js character-sheet/tests/*.test.js`; Chong Die `cd chong-die-src && npx --yes yarn@1.22.22 -s test` and `… build`.
- Commit and push straight to `main` after `git pull --rebase origin main`; messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A note with dice inside a word or a number range** (`5d6x`, `1-2d4`, `d20s`): only real expressions are underlined; nothing throws. Test in Task 2.
2. **Clicking a roll while Chong Die's window is closed:** the background opens it and the command still arrives exactly once (re-sends must not roll twice). Test in Task 5 (`createRunDeduper` ignores a repeated id).
3. **Editing a note whose text has rolls:** clicking text (not a roll) must open the editor with the full raw text, unchanged; Escape restores it. Manual check in Task 3.
4. **Old saved pills without `description`, and imports with a non-string description:** load fine, no crash. Test in Task 6.
5. **SDK 3.x upgrade:** party trays and other players' rolls still show; the popover for others' rolls still opens. Browser check in Task 4 plus the Owlbear manual list.

---

### Task 1: Combat Generator — Avrae Version

**Files:** Modify `combat-generator/generator.js` (add + export `nimbleDice`), `combat-generator/index.html` (checkbox, `CHECKS`, change listener, `asText`), `README.md` (one paragraph under Combat Generator). Test: `combat-generator/tests/generator.test.js`.

**Interfaces:** Produces `Gen.nimbleDice(text: string): string`.

- [ ] **Step 1: Failing tests**
  ```js
  test('Avrae Version splits off an exploding primary die', () => {
    assert.strictEqual(G.nimbleDice('4d8+2'), '1d8!+3d8+2');
    assert.strictEqual(G.nimbleDice('1d6+2'), '1d6!+2');
    assert.strictEqual(G.nimbleDice('2d6'), '1d6!+1d6');
    assert.strictEqual(G.nimbleDice('(2×) 2d6+3'), '(2×) 1d6!+1d6+3');
    assert.strictEqual(G.nimbleDice('Stab (2×). 1d4+2 (or Sling, Range 8).'), 'Stab (2×). 1d4!+2 (or Sling, Range 8).');
    assert.strictEqual(G.nimbleDice('Cleave. 2d6+4. OR:'), 'Cleave. 1d6!+1d6+4. OR:');
    assert.strictEqual(G.nimbleDice('3d8 (Range 12)'), '1d8!+2d8 (Range 12)');
    assert.strictEqual(G.nimbleDice('Get in here! Call a goblin minion.'), 'Get in here! Call a goblin minion.');
    assert.strictEqual(G.nimbleDice('1d8!+3d8+2'), '1d8!+3d8+2'); // already split: unchanged
  });
  test('Avrae Version keeps the same dice (same average)', () => {
    for (let i = 0; i < 200; i++) {
      const e = G.randomDice(14);
      const dice = (t) => t.match(/\d+d\d+/g).reduce((s, x) => { const [n, d] = x.split('d').map(Number); return s + n * (d + 1) / 2; }, 0);
      assert.strictEqual(dice(G.nimbleDice(e.text)), dice(e.text));
    }
  });
  ```
- [ ] **Step 2:** Run tests → FAIL (`G.nimbleDice is not a function`).
- [ ] **Step 3:** Implement: each expression = a maximal run of `NdX` / constants joined by `+`/`-`; split only its first `NdX` (skip if already followed by `!`). In `asText`, when `$('avrae').checked`, wrap generic `m.attack.text`, `L.small.attack.text`, `L.big.attack.text`, and each bestiary attack string in `Gen.nimbleDice`; leave the minion block. Add `avrae` to `CHECKS` and to the `['summary','loot']` redraw listener.
- [ ] **Step 4:** Tests → PASS (all three suites).
- [ ] **Step 5:** Browser: tick Avrae Version → damage lines change, same fight, setting survives reload.
- [ ] **Step 6:** Commit "Combat Generator: Avrae Version option".

### Task 2: Tracker — find rolls in text

**Files:** Modify `chongs-tracker/core.js` (add `findRolls` to `api`). Test: `chongs-tracker/tests/core.test.js`.

**Interfaces:** Produces `C.findRolls(line: string): { start: number, end: number, command: string }[]`.

- [ ] **Step 1: Failing tests**
  ```js
  test('findRolls: generator damage lines', () => {
    assert.deepStrictEqual(C.findRolls('Damage: 1d8!+3d8+2'), [{ start: 8, end: 18, command: '!r 1d8!+3d8+2' }]);
    assert.deepStrictEqual(C.findRolls('Damage: (2×) 3d10+1').map((r) => r.command), ['!rr 2 3d10+1']);
    assert.deepStrictEqual(C.findRolls('Damage: Stab (2×). 1d4+2 (or Sling, Range 8).').map((r) => r.command), ['!rr 2 1d4+2']);
    assert.deepStrictEqual(C.findRolls('Damage: 2d6+3 (move & hit) or 4d8 (big hit)').map((r) => r.command), ['!r 2d6+3', '!r 4d8']);
    assert.deepStrictEqual(C.findRolls('Damage: Stab. 1d4 (no crits, miss on a 1)').map((r) => r.command), ['!r 1d4']);
    assert.deepStrictEqual(C.findRolls('Roll d20 then 1d20kh1 and d%').map((r) => r.command), ['!r d20', '!r 1d20kh1', '!r d%']);
    assert.deepStrictEqual(C.findRolls('Slice (3x). 1d8+1').map((r) => r.command), ['!rr 3 1d8+1']);
  });
  test('findRolls: no false rolls', () => {
    assert.deepStrictEqual(C.findRolls('HP: 30, Save DC 13, Range 8'), []);
    assert.deepStrictEqual(C.findRolls('5d6x and d20s and add20'), []);
    assert.deepStrictEqual(C.findRolls(''), []);
  });
  ```
- [ ] **Step 2:** FAIL. **Step 3:** Implement (word boundaries on both ends; repeat = last `(N×|Nx)` before the match on the same line). **Step 4:** PASS. **Step 5:** Commit "Chong's Tracker: find rolls in note text".

### Task 3: Tracker — read view, click to roll, ack

**Files:** Modify `chongs-tracker/app.js` (`noteBox` → `noteView`), `chongs-tracker/style.css` (`.note-view`, `.roll`), `manifest.json` + `?v=` (1.8.0), `chongs-tracker/TRACKER.md`.

**Interfaces:** Consumes `C.findRolls`. Produces `sendRoll(command: string): Promise<boolean>` in `app.js` (true when acked).

- [ ] **Step 1:** `noteView(value, placeholder, onCommit)`: empty value → existing `noteBox`. Otherwise a `div.note-view` built per line from `findRolls`: plain text nodes and `button.roll` (text = the matched span). Click on `.roll` → `sendRoll(command)` (stop propagation). Click elsewhere → replace with `noteBox(value…)`, focus, caret at end; on blur → commit (if changed) and back to the view. Use it for entry notes and the tab note.
- [ ] **Step 2:** `sendRoll`: new id, listen once on `com.chongkit.chongdie/ack`, send on `/roll` LOCAL; after 1 s without ack → notification "Install Chong Die to roll".
- [ ] **Step 3:** Run all node tests → PASS.
- [ ] **Step 4: Browser check** with the repo's fake-SDK smoke page if present, else stub `OBR` in console: note with `Damage: (2×) 1d6!+1d6+3` shows one underlined span; clicking it sends `!rr 2 1d6!+1d6+3`; clicking text opens the editor with the raw text; Escape restores.
- [ ] **Step 5:** Bump version, commit "Chong's Tracker: clickable rolls in notes (v1.8.0)".

### Task 4: Chong Die — Owlbear SDK 3.x

**Files:** Modify `chong-die-src/package.json` / `yarn.lock` (`@owlbear-rodeo/sdk@^3`), any `src/plugin/*`, `src/background.ts` that break; `NOTICE.md` (line: SDK upgraded).

- [ ] **Step 1:** `npx --yes yarn@1.22.22 add @owlbear-rodeo/sdk@^3`.
- [ ] **Step 2:** `npx tsc --noEmit -p chong-die-src` → fix every error against the 3.x types (keep behavior).
- [ ] **Step 3:** `yarn test` (pass) and `yarn build` (exit 0).
- [ ] **Step 4:** Browser (standalone): tray loads, a typed roll works.
- [ ] **Step 5:** Commit "Chong Die: Owlbear SDK 3.x".

### Task 5: Chong Die — receive rolls from the tracker

**Files:** Create `chong-die-src/src/chong/incoming.ts`, `chong-die-src/src/chong/IncomingRolls.tsx`; modify `chong-die-src/src/background.ts`, `src/controls/Sidebar.tsx` (mount `<IncomingRolls/>` inside `PluginGate`). Test: `chong-die-src/src/chong/incoming.test.ts`.

**Interfaces:**
- Produces (incoming.ts, pure + store): `CHANNELS` (the four channel names); `handleIncomingRoll(command: string): "rolled" | "placed" | "error"` — reads the active tab's `instant` from `useChongStore`, uses `startCommandRoll` / `placeCommand` (falls back to rolling when nothing to place), sets `error` on failure; `createRunDeduper(): (id: string) => boolean` — true the first time an id is seen.
- background.ts: on `/roll` → send `/ack` `{id}`, `OBR.action.open()`, re-send `/run` until `/run-ack` or 3 s.
- IncomingRolls.tsx: on `/run` → send `/run-ack`, and if the deduper says new → `handleIncomingRoll`.

- [ ] **Step 1: Failing tests:** instant tab → `"rolled"` and a roll exists in `useDiceRollStore`; place tab with `2d6` → `"placed"` and `placed === "2d6"`; place tab with `1d7` → `"rolled"`; `1d0` → `"error"` and `error === "Unknown die d0"`; deduper returns `true, false` for the same id and `true` for another.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** `yarn test` PASS, `tsc` 0.
- [ ] **Step 5:** Commit "Chong Die: take rolls from Chong's Tracker".

### Task 6: Chong Die — minimalist controls and richer pills

**Files:** Modify `src/chong/savedRolls.ts` (`description?`), `chongStore.ts` (`addPill`/`editPill` take `description`), `PillDialog.tsx` (Description field), `CommandLine.tsx` (remove ★ + dialog), `RollPanel.tsx` (+ and ⚡ icon buttons in the tab row, pill label = name + dice, tooltip = description, long-press menu shows description), `public/manifest.json` (1.1.0). Test: `src/chong/savedRolls.test.ts`.

**Interfaces:** `Pill { id; name; command; description?: string }`; `addPill(tabId, name, command, description?)`; `editPill(id, name, command, description?)`; `PillDialog` `onSave(name, command, description)` and prop `initialDescription`.

- [ ] **Step 1: Failing tests:** round trip keeps `description`; `validateSavedRolls` keeps a string description, drops a non-string one (pill kept, no `description` key); an old pill without it loads with no `description` key.
- [ ] **Step 2:** FAIL. **Step 3:** Implement data + UI. **Step 4:** `yarn test` PASS; `tsc` 0; `yarn build` 0.
- [ ] **Step 5: Browser:** + opens the dialog (Roll prefilled from the command line); pill shows "Name 1d20+5"; hover shows description; ⚡ toggles highlight and behavior; ★ gone.
- [ ] **Step 6:** Commit "Chong Die: + and ⚡ buttons, pills with dice and description (v1.1.0)".

### Task 7: Docs and wrap-up

**Files:** `README.md` (Avrae Version paragraph if not in Task 1; tracker: clickable rolls; Chong Die: + / ⚡ / descriptions / tracker link), `CLAUDE.md` (tracker: rolls in notes go to Chong Die via LOCAL broadcast; Chong Die: channels, SDK 3.x), `TRACKER.md`, `chongs-tracker/TRACKER.md`, `chong-die/TRACKER.md` (add "Owlbear: click a note roll with ⚡ on/off, Chong Die closed, not installed; party trays after SDK 3").

- [ ] **Step 1:** Write docs. **Step 2:** All suites pass. **Step 3:** Commit "Docs: Avrae Version and tracker → Chong Die rolls", push.
