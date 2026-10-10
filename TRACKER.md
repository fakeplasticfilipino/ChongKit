# Tracker

Status of ChongKit tools. Update this when work starts or finishes.

Legend: ✅ done · 🚧 in progress · 📋 planned · 💡 idea

## Character Sheet (`character-sheet/`)

### ✅ v1 — done
- [x] Layout of the official Nimble sheet: details row, Hit Points shield with Temp HP, STR/DEX/INT/WIL with key-stat box and save ▲/▼, Armor, Initiative, Wounds track with skull and 5 mark boxes, 10-skill band, two notes panels
- [x] Skills = stat + points (type a total, the difference is kept); Initiative = DEX + bonus
- [x] Calculator boxes for HP / Temp HP / Current-Max (`-4`, `+3`, `13-4`); Bloodied HP in dark red
- [x] Per-section + popover: add Number / Text / Current-Max / Skill boxes, remove and restore default boxes, drag to reorder; Mana, Gold, Inventory and Max Wounds waiting under Defense
- [x] Notes: free text left, collapsible entries right (click a bar to open, drag to reorder, delete)
- [x] Several characters in localStorage; New / Copy / Delete / Export / Import (.json) / Print
- [x] Phone layout (one column, skills 5 × 2); landing-page card
- [x] Long skill names (Examination, Naturecraft) fit on narrow phones; Android's condensed font added to the fallbacks
- [x] Tests: skill math, wounds, saves, Bloodied, calculator, normalize, storage, import/export, undo
- [x] Clearer editing: playing vs **Edit layout** mode, + N tabs for extras, red × to remove, Undo toast + Ctrl+Z (keeps typing done since), grips for dragging, ↑/↓ steps numbers, outlined white fields, entry previews + expand/collapse all, More menu, Saved indicator

### ✅ v2 — done (redesign)
- [x] New look from the table's sheet: name banner, details box, rounded heavy-outlined boxes, panels with sideways labels
- [x] Six stats (STR DEX CON INT WIS CHA), each with an oval number slot; click the name to mark a key stat
- [x] Saves as their own section (STR DEX WIL): number + ▲/▼ pip
- [x] Combat panel: Armor shield, HP / Max HP / Temp, Initiative / Speed, Wounds track
- [x] Skills: Arcana, Examination, Influence, Insight, Intimidation, Lore, Naturecraft, Perception, Sleight of Hand, Stealth
- [x] Tabs (Actions / Abilities / Inventory) of collapsible bars with a summary; tabs renamed, added, deleted, reordered in Edit layout
- [x] Every section still removable / restorable / extendable; notes unchanged
- [x] v1 saves upgrade automatically (WIL → WIS, level joins class, Finesse/Might points → extra skill boxes)
- [x] Tests: new layout, saves cycle, v1 upgrade, tabs in normalize / undo / import

### ✅ v3 — done
- [x] Add another box of the section's own kind (+ Stat / Save / Skill / Line; Combat: Number, Current / Max), shown inline; trays removed
- [x] Added skills can follow added stats
- [x] Tabs work like browser tabs (+, double-click rename, × close with Undo, drag)
- [x] Notes: one free-text panel (old note entries move to a Notes tab)
- [x] Wounds fill black; optional row of 5 small dashed extra circles
- [x] Sheet fills most of the screen: slim notice, back link in the toolbar, no title or flourishes
- [x] v2 upgrade drops unused starter Mana / Gold / Inventory boxes

### ✅ Accounts — done
- [x] Optional sign-in: Discord or email + password (Supabase Auth via plain fetch, no library)
- [x] Characters sync to the account (`character_sheets`, RLS: own rows only); merge on sign-in, newer edit wins; deletes sync; refresh on returning to the tab
- [x] Tests: merge rules
- [x] Discord provider switched on in Supabase

### ✅ Paper, notes tabs, edge cases and security — done
- [x] The sheet as a sheet of paper on a darker desk: black edge, edge shading, margin lines, corner imprint
- [x] Notes in tabs (shared tab strip with the entries); v3 notes become the first tab
- [x] PKCE sign-in (Discord, email confirmation, password reset); Forgot password + New password dialog
- [x] Accounts never mix on a shared browser (`owner` per character, sync records per account); optional "remove my characters" on sign-out
- [x] Delete account (`delete_my_account()`), queued offline deletes, retry with backoff, "Not synced" / "Signed out" messages
- [x] Several tabs of the page merge each other's saves; redraws wait until you stop typing
- [x] Database: 512 KB / 200 characters limits, never replace a newer version with an older one; old `characters` table and its function removed
- [x] Security check (live project): RLS own-rows only, no secret key in the repo, no user text as HTML. Tightened: limits now 256 KB / 50 characters (so scripted accounts can't fill storage), signed-in users lose TRUNCATE/REFERENCES/TRIGGER, `anon` has no table access, `sheet_edit_stamp` signed-in only (migration `tighten_character_sheets`)
- [ ] Turn on leaked password protection (Supabase dashboard → Authentication; may need a paid plan)
- [x] Content-Security-Policy on the sheet page; imports over 1 MB refused; 8+ character passwords for new accounts
- [x] Tests: notes tabs upgrade, owner-aware merge, imports are yours

### ✅ v4 — done (flat boxes on top, notes below; spec: `docs/superpowers/specs/2026-10-09-character-sheet-v4-design.md`)
- [x] Flat whitish look (white fields, grey outlines and bands, near-square corners)
- [x] Top section: details, Current / Max pairs (♥ on HP), small boxes (Armor shield), wounds + 3 extras, stats with save pips, skills
- [x] Caps for looks (details 6, pairs 2, small boxes 6, stats 12, skills 18), even rows, every box removable / renamable / draggable
- [x] Notes: tabs → note boxes (auto columns) → notes that fold to their first line; drag notes between boxes
- [x] Reset character (back to the defaults, undoable); no automation (no math, no Bloodied, nothing derived)
- [x] Data version 5; older saves open blank
- [x] Tests: defaults, normalize, caps, columns, moveNote, step, reset, undo, saving, sync
- [x] Nimble defaults (STR DEX INT WIL, ten skills), one Actions tab, no heart or shield
- [x] Notes: four fixed boxes per tab (swap by dragging in Customize), notes as name + description; read-only when playing, edited only in Customize
- [x] Last box of each tab is a free notepad (typed in any time); tabs and save pips change only in Customize ("Edit layout" renamed Customize)
- [x] Characters menu: a card per character (⋯: Copy, Export, Print, Reset, Delete; + New, Import, Sign in); the sheet toolbar is only ☰ Characters and Customize; opens on the last-used character

### ✅ Campaigns — done (spec: `docs/superpowers/specs/2026-10-09-character-sheet-campaigns-design.md`)
- [x] Database: campaigns, members, read rule, functions (migration `campaigns`), checked as fake users
- [x] Create / join a campaign with a code; several per person; no roles; New code; Leave
- [x] Add your own characters to a campaign; members see them in the Characters menu and open them read-only
- [x] Refresh every ~30 s (no Realtime); cache per account; `Cloud.list()` only your own rows
- [ ] Two-account check at the table (one creates, a friend joins and sees the sheet update)

### 💡 Ideas
- Ancestry / Class "Apply" (fills stats, HP, saves, key stats) — needs the core rules data, which isn't in the GM Guide

## Campfire (`campfire/`)

### ✅ v1 — done (spec: `docs/superpowers/specs/2026-10-10-campfire-design.md`)
- [x] three.js r153 copied into `campfire/vendor/` (UMD build, opens from `file://`)
- [x] Scene: clearing, stone ring, forest with a gap for the moon, stars, fog; traveler, wizard, fighter around the fire
- [x] Pixel look: ~180 px render, palette snap + 4×4 dither, flat shading, hard shadows from the fire
- [x] Animation: flickering flames and firelight, embers, smoke, breathing, idle moments (look around, crystal pulse + reach, doze off), swaying trees, twinkling stars, fireflies, camera drift
- [x] Corner controls (← All tools, fullscreen) fade when idle; phones widen the view to keep everyone in frame
- [x] Tests: seeded random, noise, flicker, breathing, idle and doze envelopes, embers, smoke, render size, palette

### ✅ v2 — done
- [x] Sound, always on (Web Audio, no files): fire roar and pops, wind, three crickets taking turns, a distant owl every 60–120 s; starts on the first click/tap/key
- [x] Pops throw bursts of sparks; the wind sound and the tree sway share one gust curve
- [x] Drag to circle the fire (and raise/lower the view); glides to a stop and stays; the moon follows the view
- [x] More detail: traveler (lapels, shirt, tie, curved cane, boots), wizard (spread robe, bell sleeves, long beard, drooping hat, gnarled staff with a crook), fighter (bun, shoulder pads, belt, scabbard, pack with bedroll)
- [x] Fire teepee of logs with glowing coals; darker clearing breaking into grass; full forest ring with big old rooted trees, ferns, bushes, rocks, a fallen log, mushrooms
- [x] Tests: pops, bursts, wind, owl, crickets, orbit

### ✅ v3 — done
- [x] The moon stays in one place in the sky (up and right of the starting view), with the trees in its line of sight kept short
- [x] Characters you can tell apart: pixel-art heads with eyes, mouths and ears, elbows for real poses, turned three-quarters toward the view
- [x] Traveler: frock coat with tails, lapels, white shirt and collar points, red tie, buttons, cuffs, swept hair and sideburns, cane with a gold knob, boots
- [x] Wizard: mantle, robe trim, rope belt and pouch, big beard and moustache, bushy brows, long hair, hat with band and buckle and a drooping tip, staff with a twig and a loop around the crystal
- [x] Samurai: chonmage topknot, red lacquered dō with lacing, shoulder sode and hip kusazuri, white collar, obi, indigo hakama, tabi and sandals, katana on the back (wrapped hilt, gold tsuba) and a wakizashi, pack with a straw mat
- [x] Dark outline around near things (depth edges), 216-pixel render, 40-colour palette (skin, white, red, gold, indigo added), softer firelight colour, a soft fill light from the viewer, closer camera

### ✅ v4 — done
- [x] Darker night: a small warm pool of firelight, dim sky and fill light, dark corners
- [x] Pixel-art flames: three noise-eaten tongues on a sprite, redrawn 20 times a second; low log teepee
- [x] Stories: twig tossed on the fire (flare + sparks), the wizard's pipe and smoke rings, the samurai looking over the drawn katana (glint), glances at whoever moves
- [x] Ambience: mist between the trees, clouds crossing the moon (dimming it), shooting stars by the moon, eyes glinting across the fire (the samurai notices)
- [x] Sound: twig whoosh and landing, logs settling, katana ring and click, armour creak, pipe puffs, a distant wolf, leaves rustling, a twig snapping where the eyes are
- [x] `?at=SECONDS` to start the clock at a moment; tests for the flame shape, stories, events, flares, keyframes

### ✅ v5 — done
- [x] Stories spaced out (periods 31–74 s) so they stay special over a session
- [x] The fire burns down over ~15 minutes (darker night, smaller flames, quieter roar); the wizard raises the staff, the crystal flares, and it whooms back (shimmer + whoomp)
- [x] Seasons from the calendar: autumn (red and gold trees, falling and fallen leaves), winter (snowfall, snow on trees and ground, steaming breath, no crickets, stronger wind), spring (flowers), summer (more fireflies); `?season=` to preview
- [x] Tests: fuel and stokes (never while the wizard is busy), seasons, leaves, snow

### ✅ v6 — done
- [x] A proper camp: tripod and pot of stew (bubbles, steam, a ladle the wizard stirs by magic), candle-lit tent, the samurai's saddled horse tethered to a tree, a lantern on a forked post, moths
- [x] Forest visitors: a fox that sits to watch the fire, a deer that listens and bounds away, an owl on the lantern post (blinks, snaps its head round, bobs when it hoots); glances at them
- [x] Rain showers every 10–20 min (snow squalls in winter): streaks, splashes, hidden moon, a damped smoking fire, the wizard holds the hat; sheet lightning and distant thunder; rain and sizzle sounds, crickets stop
- [x] Click a character (twig / pipe or stir / katana) or the fire (stoke); pointer cursor over clickable things
- [x] Tests: clicks, showers, thunder, flash, fox and deer paths, the stir story

### ✅ v7 — done
- [x] A calmer breeze: quieter, lower, barely swells
- [x] Campfire talk: wordless murmurs, the listener nods and answers, sometimes everyone laughs (only when both are free)
- [x] The traveler's flute: a short pentatonic tune, notes floating up, the others listen
- [x] The samurai's whetstone; sparks that land and glow; the stew's smell in wavy lines
- [x] Walking around: E / Walk (1–3 choose), WASD / arrows / Shift / touch joystick, follow camera, collisions, walk back and sit; jointed legs, long robe standing, footsteps by season; the walker's own stories pause and the others look up
- [x] Tests: talks, flute, whetstone, collide, gait

### ✅ v8 — done
- [x] Livelier arms: shoulders clear of the body, wrists, idle motion in shoulders / elbows / wrists; walking arms swing with bent elbows
- [x] The traveler's coat hangs at the hips instead of jutting forward
- [x] The horse's neck arches forward (was bent back); grazing lowers the head to the grass
- [x] The wizard walks with the staff, planting it with each stride

### ✅ v9 — done
- [x] The flute is now an acoustic guitar: Creep's chords (G – B – C – Cm) strummed down, down-up, up-down-up, plucked-string sound, strumming hand, nods to the beat

### ✅ v10 — done
- [x] The guitar varies: four songs (Creep + G Em C D, Am F C G, Em C G D) take turns, each in one of four styles (strum, fingerpick, slow melody over the bass, boom-chick with a walking bass); every song meets every style within 16 runs; clicks pick their own
- [x] Tests: songs, styles, rotation, notes inside the run

### ✅ v11 — walk-up interactions and secrets (spec: `docs/superpowers/specs/2026-10-10-campfire-interactions-design.md`)
- [x] Spots with an F hint (tap on touch): horse (pet / apple), stew, sit (log, rock), fire (twig / warm), tent (peek), talk to the others; moving cancels
- [x] Props react (horse, apple, bowl, tent candle), sitting lowers the camera, action sounds; the owl looks, the fox runs off
- [x] Secrets at the clearing's edge (13) and the tally
- [x] Tests: actions, spots, secrets, readFound

### 💡 Ideas
- Choose the party (count and looks from presets: hat, hood, helmet, cloak colour, staff, sword)

## Site look

### ✅ Back to the GM Guide look, easier on the eyes — done
- [x] Tried a "modern" look (flat cards, top bar, monster cards); reverted: too bright, top bar distracting, the table prefers text output
- [x] Palette resampled from the GM Guide: darker matte parchment (#e9e1d0), lighter parchment inside frames, soft brown-black ink (#2b2520), outlines #3a332c, no white surfaces anywhere
- [x] Notched stat-block frames filled with panel parchment; flourishes, ribbon bars and squared controls kept
- [x] Landing page: divider ornament under the title
- [x] Combat Generator: setup and the text output side by side (stacked on phones); output box sits in a stat-block frame
- [x] Character Sheet recoloured from white to parchment (fields, boxes, tabs, notes)
- [x] Corner flourishes removed everywhere; landing page tools in three equal columns (one on narrow screens)
- [x] Combat Generator as wide as the sheet; the text frame grows to the setup panel's height; More options in two columns

## Combat Generator (`combat-generator/`)

### ✅ v1 — done
- [x] Extract rules from the GM Guide (p.22, 25–27, 30–31, 44, 75) → `nimble-data.js`, `docs/rules-reference.md`
- [x] Encounter budget by difficulty (Easy / Medium / Hard / Deadly / Very Deadly) — p.26
- [x] 1–4 monsters per hero, levels drawn from the Monster Builder table — p.26, p.30
- [x] HP by armor (None / Medium / Heavy), 60/30/10 armor mix — p.26, p.30
- [x] **Randomized damage dice with exactly the guide's average** (single or 2× attacks, any die or themed die)
- [x] Save DC + CR equivalent per monster — p.30
- [x] Optional flavor abilities (HP drops 1 row per ability) — p.30–31
- [x] Minion waves (0–4 per hero), die size by party level — p.25, p.27
- [x] Legendary solo boss (HP, Bloodied, Last Stand, small/big attack, DC) — p.44
- [x] Expected gold reward per hero + party, patron wealth shift — p.22, p.26, p.75
- [x] Editable monster names, copy-as-text
- [x] UI restyled to match the GM Guide (parchment, stat-block frames, ability bars, heart/shield icons)
- [x] Simple UI: −/+ steppers, boxed toggles for fight type and difficulty, More options, auto-regenerate, HP / Damage / Save DC stat boxes, one toolbar (New Encounter · New Dice · Copy)
- [x] Removed: dice rolling, HP trackers, helper and explainer text (not wanted)
- [x] Tests: dice averages, difficulty bands, HP table lookup, reward table

### ✅ v2 — done
- [x] Bestiary picker (p.33–41): Creatures = Generic or one of 10 families (Kobolds, Goblins, Bandits, Snakemen, Dungeon Denizens, Hill & Field, Undead, Forest Denizens, Cultists/Horrors, Underground). Every stat block transcribed and checked against page images.
- [x] Exact level-mix search so named fights land inside the p.26 band with 1–4 per hero; families that can't are greyed out
- [x] Save DC for bestiary monsters **derived** from the p.30 row by level (marked "(by level)")
- [x] Faction loot tables shown with the reward (Kobold, Goblin, Bandit, Dungeon Denizen, Undead, Briarbane, Horrible, Underground)
- [x] Output is one plain, editable textbox (Name xN / HP / Armor / Damage / Save DC), with New Encounter · New Dice · Copy

### ✅ v3 — done
- [x] Build: Normal / Mixed / Glass cannon / Tank (p.30: damage and HP shift 1–5 rows in opposite directions; tank mirror is the tool's reading)
- [x] Unique encounter twist (p.28–29, all 37), off by default
- [x] Generic monsters fill in when a family can't reach the budget (shown with their level for reskinning)
- [x] Setup choices remembered in localStorage (never the generated fight)
- [x] Summary line and Loot are options (More options), off by default; ticking them redraws the same fight

### Avrae Version — removed
- Was: More options → Avrae Version (`4d8+2` → `1d8!+3d8+2`). Removed: Chong Die applies Nimble's primary-die rules itself (`1d10+3 crit miss`)

### 📋 Next up
- (nothing queued)

## ✅ Nimble 3rd Party Creator License
- [x] Attribution word for word in every Nimble page footer (landing page, combat generator, rules reference)
- [x] Free-to-use notice as a banner at the top of each Nimble page, linking nimbleRPG.com

## Chong's Tracker (`chongs-tracker/`)
Owlbear Rodeo extension, tracked separately in [chongs-tracker/TRACKER.md](chongs-tracker/TRACKER.md).

## Chong Die (`chong-die/`)
Owlbear Rodeo dice extension, a fork of owlbear-rodeo/dice (GPL-3.0) with a plain-words command line, an engine that decides every roll, and saved-roll pills.
- ✅ Chong Die 4.0.0 and Chong's Tracker 1.10.0: new command language, no roll link between them.
- ✅ Chong Die 4.1.0: ⚡ Quick roll back; `crit>=5` / `miss<=4` comparisons.
- ✅ v3.1.0: dice land on the record's face naturally (pre-simulated throw played back, no turn after landing).
- ✅ v3.0.2: the roll engine rebuilt (CLI-first, engine-decided, dice land on the record's face), saved names (`nimble` built in), Primary Die outlines from the record; Avrae syntax, waves, right-click exploding and the Nimble switch removed. Status, Owlbear checklist and backlog: [chong-die/TRACKER.md](chong-die/TRACKER.md); how it works: `chong-die-src/DESIGN.md`

## Site (GitHub Pages)
- [x] Landing page (`index.html`) with a card per tool
- [x] Shared stylesheet `assets/css/nimble.css`
- [x] `_config.yml` keeps the PDF, tests and notes off the public site
- [x] Pages is on (https://fakeplasticfilipino.github.io/ChongKit/)

## Other tools (future)
- 💡 Skill challenge runner (p.15): on hold. Checked the guide: p.15 is advice only (no numbers); the one mechanic is the p.72 example ("starting DC is 10 and increases by 1 for each check"). No success/failure counts or difficulty table, so a tool would mostly be invented rules

## Open questions
- Gold per encounter is **derived**, not printed in the guide (see README → Rewards). Adjust the
  sessions-per-level or session-mix assumptions in `nimble-data.js` if our table levels faster/slower.
