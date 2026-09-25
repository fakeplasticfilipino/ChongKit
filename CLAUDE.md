# CLAUDE.md

Guidance for Claude (and humans) working in this repo.

## What this is

ChongKit is a set of TTRPG tools for one table running **Nimble 5e (v2)**. The rules source is
`ilide.info-nimble-5e-v2-gm-guide-v2-0-1-pr_*.pdf` (Nimble 5e v2 GM Guide v2.0.1, 115 pages).
Page numbers in code and docs are the **printed** page numbers (PDF page index = printed + 1).

## Ground rules

1. **The guide is the source of truth.** Every number (HP, damage, DCs, gold, difficulty bands) must
   come from the PDF and cite its page in a comment. If a value is derived (not printed in the guide),
   say so explicitly in code comments, the README, and the UI.
2. **Dice are randomized but average-preserving.** Any damage shown must average *exactly* the
   guide's damage-per-round (only level-1/4's 3 dmg may be ±0.5 — no exact dice exist). Never change
   this without updating `tests/generator.test.js`.
3. **Keep tools zero-install.** Plain HTML + vanilla JS that opens from `file://`. No build step, no
   CDN dependencies, no frameworks.
4. **Keep it simple.** This is for use mid-session at the table; favor big readable numbers over features.

## Layout

```
README.md                    What the tools are + how to use them
TRACKER.md                   Status / backlog — update when you finish or add work
docs/rules-reference.md      Transcribed rules tables with page cites
combat-generator/
  index.html                 UI (open directly in a browser)
  nimble-data.js             All rules data from the guide (single source of numbers)
  generator.js               Pure logic: dice, encounter building, rewards, attack rolls
  tests/generator.test.js    node:test suite
```

`nimble-data.js` and `generator.js` work both as browser scripts (globals `NIMBLE`, `Gen`) and as
CommonJS modules for Node tests.

## Commands

- Test: `node --test combat-generator/tests/*.test.js` (Node 18+, no dependencies)
- Run: open `combat-generator/index.html` in a browser.

## Reading the PDF

Text extraction works with PyMuPDF: `pip install pymupdf`, then
`python3 -c "import pymupdf; d=pymupdf.open('<pdf>'); print(d[30].get_text())"` — the 0-based
index equals the printed page number, so `d[30]` is printed p.30 (Monster Builder).
Bestiary stat blocks (p.33–41) extract with HP numbers detached from their monsters — verify
against a rendered page image before transcribing.

## Workflow

- Update `TRACKER.md` when a task starts/finishes.
- Run the tests before committing.
