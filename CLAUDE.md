# CLAUDE.md

Guidance for Claude (and humans) working in this repo.

## What this is

ChongKit is a set of TTRPG tools for one table running **Nimble 5e (v2)**, plus **Chong's Tracker**, a
system-agnostic Owlbear Rodeo extension, **Chong Die**, a fork of the Owlbear Rodeo dice
extension, and **Campfire**, a three.js ambience scene (see their own sections below; the Nimble ground rules don't apply to them). The rules source is
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
   must still work offline on its fallback fonts. One exception: the Character Sheet's optional
   sign-in and sync talk to Supabase with plain `fetch` (no client library); signed out, it works
   fully offline on localStorage.
4. **Match the GM Guide's look.** Parchment background (no corner flourishes: they distract), heavy
   wedge-serif headings (Merriweather 900 standing in for Beaufort Pro Heavy), condensed sans body
   (Barlow Semi Condensed for Avenir Next Condensed), notched-corner stat blocks with italic
   small-caps names, grey arrow-tipped ability bars, heart/shield icons for HP/armor, dark red
   (`--blood`) for Bloodied numbers. Reuse the classes and tokens in `assets/css/nimble.css`.
   - **Easy on the eyes, like the printed page:** matte parchment everywhere, never white surfaces
     or fields (`--panel`, `--parchment-hi`), and soft brown-black ink
     (`--ink` #2b2520, outlines `--frame` #3a332c), never pure black. Red is for Bloodied and Deadly only. The Character Sheet has its own flat whitish look (see its section).
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

1. **Its own flat look** (v4, the table's choice), not the GM Guide's parchment: simple whitish boxes.
   White fields, thin grey outlines (`#4a4a4a`), flat grey label bands with white caps text (`#6f6f6f`),
   near-square corners (3 px), a light grey page, no red on the sheet. `body.cs-flat` overrides
   `nimble.css`'s tokens; the notice and footer stay. No icons in the boxes (no heart, no shield). The top
   section (name + details; Current / Max pairs; small boxes; wounds = five circles + skull, then 3 dashed
   extras; stats with ▲▽ save pips; skills) spans the width (it stacks into one column below 1150 px wide),
   and the notes span the width below it: four tall note boxes side by side (two below 1150 px, one on
   phones). The sheet's toolbar is only ☰ Characters and Customize; everything else lives in the
   **Characters menu** (`menu.js`): a card per character (most recently edited first; the page opens on
   the last-used character), each card's ⋯ with Copy, Export file, Print, Reset character and Delete,
   plus + New character, Import and the account. Printing (a card's ⋯ → Print or Ctrl+P) prints the top
   section on page 1 and the open tab's notes after it, every note open.
   Its own styles live in `character-sheet/sheet.css`.
2. **A sheet you write on.** It holds HP and Wounds on purpose, but nothing is automated: every box is the
   text typed into it. No dice, no calculator math, no Bloodied colour, nothing follows anything else.
   ↑/↓ step a whole number (`Sheet.step`).
3. **No GM Guide numbers:** the layout, the defaults and the caps are the table's choices; call them derived.
   Don't add class or ancestry data that isn't in the PDF.
4. **Configurable, with caps for looks:** details 6, Current / Max pairs 2, small boxes 6, stats 12, skills
   18 (`Sheet.CAPS`), laid out in even rows (`Sheet.columns`). In **Customize** every box (defaults too) gets
   a × and a grip, its label becomes a field, and each list ends with a dashed + button while there's room.
   Reset character brings back the defaults (`Sheet.reset`, undoable): Nimble's four stats (STR DEX INT
   WIL) and ten skills, one Actions tab. Save pips show while playing and change only in Customize. Notes:
   tabs (`tabStrip`; playing you can only switch tabs, Customize adds +, double-click rename, ×, drag),
   each with exactly four note boxes (`Sheet.NOTE_BOXES`; a new tab has four; no adding or removing boxes):
   three lists of notes (a name and a description) and one free box of plain text (`free`, last in a new
   tab), which can be typed in any time. Playing, list notes are read-only: click a name to open its
   description. Only in Customize can notes be added, typed in, deleted or dragged (`Sheet.moveNote`;
   never into the free box), box titles typed, and boxes swapped by dragging one onto another
   (`Sheet.swapBoxes`). Layout changes go through undo (`undoLayout` keeps typing done since).
5. Data version 5, saved in localStorage under `chongkit.sheets` (every character in one key). Older
   versions aren't upgraded: they open blank, keeping only id, owner and last edit. Logic lives in
   `sheet.js` (browser global `Sheet`, CommonJS for tests), covered by `tests/sheet.test.js`; the notes
   are drawn by `notes.js` (global `SheetNotes`) and the Characters menu by `menu.js` (global
   `SheetMenu`), both given `ui.js`'s helpers.
6. **Accounts (optional):** `cloud.js` (browser global `Cloud`) signs in with Discord or email +
   password against Supabase project `chong-nimble-sheet` (ref `fmkbvoukbrxjbzlexjhu`) and syncs
   characters to `public.character_sheets` (`user_id`, `id`, `data` jsonb, `updated_at`, `campaign_id`; RLS: write own rows, read own rows and those in your campaigns). `Cloud.list()` asks for your own rows only (`Sheet.ownRowsPath`): without that, campaign friends' characters would merge into yours. Each character carries `updated` (ms of its last edit) and `owner` (the account it
   synced to); `Sheet.mergeChars` merges account and browser (newer edit wins; another account's
   characters are never uploaded; queued deletes are respected; tested). The publishable key in
   `cloud.js` is public by design; never put a secret/service key in the repo. The session is in
   localStorage `chongkit.auth`; sync records are per account (`chongkit.synced.<user>`,
   `chongkit.deletes.<user>`).
7. **Security rules (keep them):** sign-in uses PKCE (never tokens in the URL); user text is only ever
   set as text/value, never as HTML; the page has a Content-Security-Policy (scripts from the site,
   data only to the Supabase project); the database refuses characters over 256 KB, more than 50
   per account, and older versions over newer ones (trigger `character_sheets_keep_newer`);
   `delete_my_account()` (security definer) only ever deletes the caller; signed-in users get only
   SELECT/INSERT/UPDATE/DELETE on `character_sheets` (no TRUNCATE etc.) and `anon` gets nothing. Tabs of the page merge each
   other's saves (`storage` event); deletes made offline are queued; failed syncs retry with backoff.
   Campaign members can read each other's characters, never write them; `authenticated` has no INSERT/UPDATE on `campaign_id` (only `set_character_campaign`, `leave_campaign` and `delete_my_account` change it); every campaign change is a `security definer` function acting only as the caller; a wrong join code always says "No campaign with that code".
8. **Campaigns** (`campaigns.js`, browser global `SheetCampaigns`): players of a campaign see each
   other's characters. Tables `campaigns` (name, 6-character `code`) and `campaign_members` (with a
   display `name`); `character_sheets.campaign_id`. Functions: `create_campaign`, `join_campaign`,
   `leave_campaign` (the last member out deletes it), `rename_campaign`, `new_campaign_code`,
   `set_character_campaign` (own characters only, a campaign you're in). No roles; several campaigns
   per account (10), 12 members each, one campaign per character. The Characters menu has "Your
   characters" then a section per campaign (`menu.js` shares its `card`); a friend's card opens their
   sheet read-only (`ui.js` "viewing": nothing saved, synced or undone). No Realtime: it refreshes every
   30 s while the menu or a friend's sheet shows (`Sheet.campaignDiff` / `campaignMerge` download only
   what changed); the last copy is in localStorage `chongkit.campaigns.<user>`.

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

## Chong Die (Owlbear Rodeo dice)

A fork of [owlbear-rodeo/dice](https://github.com/owlbear-rodeo/dice) with a plain-words command
line, an engine that decides every roll, and saved-roll pills. How it works: `chong-die-src/DESIGN.md` (keep it current).

1. **System-agnostic.** The engine knows general words only (`adv`, `dis`, `chain`, `miss`, `chainadv`, `xN`), never a game system. Nimble is just `1d10+3 chain miss`; other systems' rules may be added as words, never as built-in behaviour. The chain rule is the table's: only the Primary Die checks the `chain` range; a chain die chains again only on its max. In a roll with `chain` or `miss` the Primary Die is always the leftmost die (`leftmostPrimary`: values are handed round between 3D dice, the record never changes).
2. **The one built tool.** It breaks the zero-install rule on purpose: React + TypeScript + three.js,
   built with Vite. Source in `chong-die-src/` (off the site, public on GitHub);
   `npx yarn@1.22.22 build` writes `chong-die/`, which is committed. **Rebuild and commit
   `chong-die/` after every source change.** The build empties `chong-die/` except `TRACKER.md`.
3. **Bump `public/manifest.json` → `version` on every change.** Built files have hashed names, so no
   `?v=`. After a push, browsers may keep the old files for 10 minutes.
4. **GPL-3.0.** Keep `chong-die-src/LICENSE` and list every change in `chong-die-src/NOTICE.md`;
   the ⋯ → About credit stays.
5. **Chong's Tracker's look** (`src/chong/look.ts` copies `chongs-tracker/style.css`: change both
   together), no `nimble.css`, no Nimble notice or footer. Plugin id prefix `com.chongkit.chongdie/`.
6. **Contract with other trays:** rolls carry the `chong` metadata (`v: 4`, the record every player's tray acts out): a roll in another format must still show as text. There is no link with Chong's Tracker: rolls are copied from notes by hand.
7. Logic stays in pure, tested modules (`src/engine/`, `src/chong/*.ts`); `npm test` runs them.
   Status and backlog: `chong-die/TRACKER.md`. Upstream fixes: diff the upstream repo against
   `chong-die-src/` and port by hand.

## Campfire (ambience scene)

`campfire/`: a pixel-art scene of the party around a campfire in a forest at night, for a screen at
the table. Not a rules tool: no Nimble text, no GM Guide numbers, no notice or footer, no `nimble.css`.

1. **three.js is its one library**: `vendor/three.min.js` (r153, the UMD build with global `THREE`,
   so it still opens from `file://`; ES-module builds don't) with `vendor/three.LICENSE.txt`. Copied,
   not built; don't edit it. Everything else is plain JS with no build step.
2. **The pixel look:** render about 216 px on the short side (`CampAnim.renderSize`) into a render
   target, then a shader pass snaps every pixel to `CampAnim.PALETTE` (48 colours max, the shader's array; sampled from
   the art reference) with a light 4×4 dither. Keep materials flat-shaded and low-poly.
3. **No controls beyond** "← All tools" and fullscreen in a corner (they fade when the mouse rests),
   and dragging to circle the fire (`CampAnim.orbit`; the view stays where it's left). The figures
   are fixed (traveler, wizard, samurai), turned three-quarters toward the starting view like the
   reference; the animation is the point. The forest is a full ring, so every angle must look finished.
   The moon has one fixed place in the sky (up and right of the starting view; trees in its line of
   sight are kept short, `underMoon`); it never follows the camera (the table hated that).
   Near things get a dark 1-pixel outline from a depth-edge test in the pixel pass (flames are kept
   out of it: they don't write depth). The flames are a sprite drawn from `CampAnim.fireHeat`
   (noise-eaten tongues) at 20 frames a second. Keep the night dark: the fire lights a small pool.
   Stories (`CampAnim.STORIES`) are picked so one figure never runs two at once (tested); their
   moments (`CampAnim.events`) drive both the picture and the sound. `?at=SECONDS` starts the clock
   there, for checking a moment. The fire burns down (`CampAnim.fuel`) and the wizard stokes it back
   when free (`stokeTime`). Seasons come from the calendar (`CampAnim.season`; `?season=` previews).
4. **Sound is always on, never a mute button** (the table's choice). It's generated with Web Audio in
   `audio.js` (no sound files), starting on the first click/tap/key as browsers require. Its timing
   comes from `anim.js` (`pops`, `wind`, `chirps`, `owls`), shared with the picture: pops throw
   sparks (`bursts`), wind drives the sway.
5. Timing math lives in `anim.js` (global `CampAnim`, CommonJS for tests), covered by
   `tests/anim.test.js`; `figures.js` (`CampFigures`) builds the figures; `scene.js`
   (`CampScene.build`) makes and moves the world; `app.js` renders and handles dragging.

## Layout

```
index.html                   Site landing page: a card for each tool   → /
_config.yml                  GitHub Pages config (excludes repo-only files)
assets/css/nimble.css        Shared GM-Guide look for every page
character-sheet/             → /character-sheet/
  index.html                 Page: the sheet's toolbar and the Characters menu
  sheet.js                   Pure logic: the v5 model, caps, even rows, notes, saving, import/export
  ui.js                      Draws the top section and toolbar; card actions; saving, sync, undo; sign-in
  notes.js                   Draws the notes: tabs of four note boxes (three lists of notes, one free box)
  menu.js                    Draws the Characters menu: a card per character
  campaigns.js               Draws the campaigns in the Characters menu; refreshes them every 30 s
  cloud.js                   Optional sign-in (Discord / email) and sync via Supabase
  sheet.css                  The sheet's look
  tests/sheet.test.js        node:test suite (not published)
campfire/                    Ambience scene (three.js, pixel style) → /campfire/
  index.html, app.js         Page, renderer, pixel pass, loop, dragging
  scene.js                   Builds and moves the world (forest, fire, props)
  figures.js                 The traveler, wizard and samurai
  audio.js                   Generated sound (Web Audio): fire, wind, crickets, owl
  anim.js                    Pure timing math: flicker, idle moments, embers, sound schedules, orbit, palette
  vendor/three.min.js        three.js r153, copied (don't edit)
  tests/anim.test.js         node:test suite (not published)
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
chong-die/                   Built Chong Die (committed) → /chong-die/ (install: manifest.json)
  TRACKER.md                 Its status and backlog (not published)
chong-die-src/               Chong Die source: fork of owlbear-rodeo/dice (GPL-3.0, not published)
  src/engine/                Roll engine: parse, roll, record, format, faces (+ Vitest tests)
  src/chong/                 Command line, panel, pills, saved rolls, roll runner, outlines
  DESIGN.md                  How Chong Die works (keep it current)
docs/rules-reference.md      Rules tables with page numbers → /docs/rules-reference.html
source/                      The GM Guide PDF (not published)
README.md                    What the tools are and how to use them
package.json                 Only `npm test` (no dependencies; not published)
TRACKER.md                   Status and backlog (not published)
CLAUDE.md                    This file (not published)
```

`nimble-data.js` and `generator.js` work both as browser scripts (globals `NIMBLE`, `Gen`) and as
CommonJS modules for Node tests.

## Commands

- Test everything: `npm test` in the repo root (Node 22+; no dependencies, except Chong Die's: run
  `npx yarn@1.22.22` in `chong-die-src/` once)
- Build Chong Die: `cd chong-die-src && npx yarn@1.22.22 build`
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
- Run `npm test` before committing, then push to `main`.
