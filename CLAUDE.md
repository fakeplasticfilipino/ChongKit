# CLAUDE.md

Guidance for Claude (and humans) working in this repo.

## What this is

ChongKit is a set of TTRPG tools for one table running **Nimble 5e (v2)**, plus **Chong's Tracker**, a
system-agnostic Owlbear Rodeo extension (see its own section below; the Nimble ground rules don't
apply to it). The rules source is
`source/nimble-gm-guide-v2.0.1.pdf` (Nimble 5e v2 GM Guide v2.0.1, 115 pages).
Page numbers in code and docs are the **printed** page numbers (PDF page index = printed + 1).

## Ground rules (Nimble tools: the combat generator, rules reference)

1. **The guide is the source of truth.** Every number (HP, damage, DCs, gold, difficulty bands) must
   come from the PDF and cite its page in a comment. If a value is derived (not printed in the guide),
   say so explicitly in code comments, the README, and the UI.
2. **Dice are randomized but average-preserving.** Any damage shown must average *exactly* the
   guide's damage-per-round (only level-1/4's 3 dmg may be ±0.5 — no exact dice exist). Never change
   this without updating `tests/generator.test.js`.
3. **Keep tools zero-install.** Plain HTML + vanilla JS that opens from `file://`. No build step, no
   frameworks, no CDN scripts. The only external request allowed is Google Fonts, and every page
   must still work offline on its fallback fonts.
4. **Match the GM Guide's look.** Parchment background, thin brown corner flourishes, heavy
   wedge-serif headings (Merriweather 900 standing in for Beaufort Pro Heavy), condensed sans body
   (Barlow Semi Condensed for Avenir Next Condensed), notched-corner stat blocks with italic
   small-caps names, grey arrow-tipped ability bars, heart/shield icons for HP/armor, dark red
   (`--blood`) for Bloodied numbers. Reuse the classes and tokens in `assets/css/nimble.css`.
   - **Easy on the eyes, like the printed page:** matte parchment everywhere, never white surfaces
     or fields (`--panel`, `--parchment-hi`, the sheet's `--sheet`/`--fld`), and soft brown-black ink
     (`--ink` #2b2520, outlines `--frame` #3a332c), never pure black. Red is for Bloodied and Deadly only.
   - No site-wide top bar: each tool page has a "← All tools" link.
5. **Keep it simple.** This is for use mid-session at the table; favor big readable numbers over features.
   - No helper or explainer text in the UI (no "tap here to…" tips, no difficulty descriptions, no
     "how this is worked out"). Labels and numbers only; explanations belong in the README.
   - No dice rolling or HP tracking. The tool shows stats; the table rolls real dice.
   - Controls must look clickable: squared, bordered buttons and toggles (`.btn`, `.seg`, `.stepper`).
     Arrow-tipped ribbons (`.bar`) are for ability text only, never for buttons.
   - The Combat Generator's output is one editable plain-text box (the table prefers text). Chong's
     Tracker parses that text when it's pasted (`asText` in `combat-generator/index.html`): don't
     change the format without updating the tracker's parser.
6. **Always pull, then commit and push straight to `main`.** Pull (`git pull --rebase origin main`) before
   starting work and before pushing; work happens on several devices. Don't create branches or pull requests.
7. **The repo is a GitHub Pages site** (served from `main`, root folder). Keep it organized:
   - Each tool lives in its own folder with an `index.html` (so its URL is `/<tool-name>/`).
   - Add every new tool as a card on the root `index.html`.
   - Shared styles go in `assets/css/nimble.css`. Link it with a relative path (`../assets/css/nimble.css`).
   - Use relative links only. Never start a link with `/`: the site is served under `/<repo-name>/`.
   - Anything that must not be public (the PDF, tests, notes) goes in `_config.yml` → `exclude`.
   - Keep the Nimble 3rd Party Creator License attribution in every page footer, word for word:
     "ChongKit is an independent product published under the Nimble 3rd Party Creator License.
     Nimble © Nimble Co."
   - Every Nimble page also needs the license's free-to-use notice as a banner at the top
     (`.notice`), linking nimbleRPG.com. This is the one exception to "no explainer text".
     Chong's Tracker uses no Nimble text, so it doesn't need either.

## Character Sheet

`character-sheet/`: the Nimble character sheet. The Nimble ground rules apply, with these differences:

1. **The sheet is our table's sheet** (v2): rounded heavy-outlined boxes, panels with sideways labels,
   parchment fields (never white), condensed caps labels, set on the usual parchment page with the
   notice and footer. The sheet fills most of the screen (slim notice, one toolbar row, no corner flourishes).
   Six stats (STR DEX CON INT WIS CHA, each with an oval number slot), three saves (STR DEX WIL),
   Combat (Armor, HP, Initiative/Speed, Wounds + optional 5 dashed extra circles; filled wounds are
   black), ten skills, tabs of collapsible entries, notes.
   Its own styles live in `character-sheet/sheet.css`; page chrome still comes from `nimble.css`.
2. **It tracks HP and Wounds on purpose** (it's a sheet). Still no dice rolling.
3. **No GM Guide numbers:** the layout, stats, saves, skill/stat pairs and the six-wound track are the
   table's choices; call them derived. Don't add class or ancestry data that isn't in the PDF.
4. **Configurable:** playing vs Edit layout. In Edit layout each section ends with a bar that adds
   another box of the section's own kind (`ADDS`: stat, save, skill, detail line; Combat: number or
   current/max) and restores removed ones; added boxes show inline with the defaults, boxes get a × to
   remove and added ones a grip to reorder. Tabs are managed directly, like browser tabs (+, double-click
   rename, ×, drag). Notes are one free-text panel. Layout changes go through undo (`undoLayout` keeps typing done since). Default boxes are removed via `removed` (`section:id`), extras live in `extras`. Tabs live in `tabs` (name + entries). Old saves are upgraded in `normalize` (`upgrade1` for v1, `upgrade2` for v2).
5. Saved in localStorage under `chongkit.sheets` (every character in one key). Logic lives in
   `sheet.js` (browser global `Sheet`, CommonJS for tests) and is covered by `tests/sheet.test.js`.

## Chong's Tracker (Owlbear Rodeo extension)

A separate tool with its own rules. It is **system-agnostic**: no Nimble rules, no GM Guide numbers.

1. **Owlbear's look**, not the GM Guide's: one flat look matching Owlbear's panels (translucent white
   surfaces, Owlbear's purple accent, no light/dark switching), Roboto/system fonts, no
   parchment. Don't use `assets/css/nimble.css` there.
2. **It tracks HP on purpose.** The "no HP tracking" rule above is for the combat generator only.
   Still no dice: HP boxes do arithmetic (`20-3`), the table rolls real dice.
3. **State lives in the scene's metadata**: one key per entry (`com.chongkit.tracker/e/<id>`) and one
   key per tab (`com.chongkit.tracker/t/<id>`), deleted = `null`. The one exception: a tab the user
   saves to the room lives, with its entries, in the room's metadata under the same keys (the room
   holds only 16 kB, so it warns); `t/players` there only marks the Players tab as a room tab.
   The old single `com.chongkit.tracker/tabs` key is only read to migrate it. Token badges
   are local items drawn by `background.js`, never saved.
4. **The Owlbear SDK is the one install exception**: `vendor/obr-sdk.js` is `@owlbear-rodeo/sdk`
   bundled once with esbuild into a single ESM file and committed. Everything else stays plain
   HTML + vanilla JS with no build step. To update the SDK, rebuild that one file (see README).
5. **Manifest paths are absolute** (`/ChongKit/chongs-tracker/...`): the site is served under
   `/ChongKit/`. This is the only place a path starts with `/`.
6. Keep the logic that can be tested (math, HP rules, parsing, metadata) in `core.js`, which works as
   a browser script (`window.ChongCore`) and a CommonJS module, and cover it in `tests/core.test.js`.
7. Its status and backlog live in `chongs-tracker/TRACKER.md`.
8. **Bump the version on every change**: `manifest.json` → `version`, and the matching `?v=` on every
   script/stylesheet link in `index.html` and `background.html`. GitHub Pages lets browsers cache each
   file for 10 minutes, so without it Owlbear can mix old and new files (e.g. a new `app.js` with an
   old `core.js`) and the panel breaks.

## Layout

```
index.html                   Site landing page: a card for each tool   → /
_config.yml                  GitHub Pages config (excludes repo-only files)
assets/css/nimble.css        Shared GM-Guide look for every page
character-sheet/             → /character-sheet/
  index.html                 Page + toolbar
  sheet.js                   Pure logic: defaults, skill math, calculator, saving, import/export
  ui.js                      Draws the sheet, trays, tabs and entries
  sheet.css                  The sheet's look
  tests/sheet.test.js        node:test suite (not published)
combat-generator/            → /combat-generator/
  index.html                 UI (setup panel, the fight as editable text)
  nimble-data.js             All rules data from the guide (single source of numbers)
  generator.js               Pure logic: dice, encounter building, rewards
  tests/generator.test.js    node:test suite (not published)
chongs-tracker/              Owlbear extension → /chongs-tracker/ (install: manifest.json)
  manifest.json              Owlbear extension manifest
  index.html, app.js         The panel (action popover)
  background.html/.js        Token badges + right-click "Track"
  core.js                    Pure logic: math, HP rules, command parser, metadata
  style.css                  Owlbear-style look
  vendor/obr-sdk.js          Bundled @owlbear-rodeo/sdk (don't edit)
  tests/core.test.js         node:test suite (not published)
  TRACKER.md                 The tracker's own status and backlog (not published)
docs/rules-reference.md      Rules tables with page numbers → /docs/rules-reference.html
source/                      The GM Guide PDF (not published)
README.md                    What the tools are and how to use them
TRACKER.md                   Status and backlog (not published)
CLAUDE.md                    This file (not published)
```

`nimble-data.js` and `generator.js` work both as browser scripts (globals `NIMBLE`, `Gen`) and as
CommonJS modules for Node tests.

## Commands

- Test: `node --test combat-generator/tests/*.test.js chongs-tracker/tests/*.test.js character-sheet/tests/*.test.js` (Node 18+, no dependencies)
- Run: `python3 -m http.server` in the repo root, then open http://localhost:8000/ (this matches how GitHub Pages serves it). Opening a tool's `index.html` directly also works.

## Reading the PDF

Text extraction works with PyMuPDF: `pip install pymupdf`, then
`python3 -c "import pymupdf; d=pymupdf.open('source/nimble-gm-guide-v2.0.1.pdf'); print(d[30].get_text())"` — the 0-based
index equals the printed page number, so `d[30]` is printed p.30 (Monster Builder).
Bestiary stat blocks (p.33–41) extract with HP numbers detached from their monsters — verify
against a rendered page image before transcribing.

## Workflow

- **Always pull first.** Run `git pull --rebase origin main` at the start of every session and again before
  committing: work happens on several devices, so the local copy may be behind.
- Update `TRACKER.md` (or `chongs-tracker/TRACKER.md` for the tracker) when a task starts/finishes.
- Run the tests before committing, then push to `main`.
