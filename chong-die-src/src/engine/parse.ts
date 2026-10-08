import { parseRange } from "./range";
import { EngineError, GroupPlan, MAX_DICE, MAX_SIDES, MAX_TIMES, Plan, Range } from "./types";

const DICE = /^(\d*)d(\d+|%)$/i;
/** The words (the only list of them): a word glued to an optional number, or a range for crit/miss */
const WORD = /^(critadv|adv|dis|crit|miss)(\d+(?:-\d+)?)?$/i;
/** crit and miss also take a comparison: `crit>=5`, `crit>9`, `miss<=4`, `miss<2` */
const COMPARE = /^(crit|miss)([<>]=?\d+)$/i;
const TIMES = /^x(\d+)$/i;
/** A sign; a crit/miss range glued whole (its - is the range's); else a run of anything but spaces and signs */
const TOKEN = /\s*(?:([+-])|((?:crit|miss)\d+-[^\s+-]+)|([^\s+-]+))/iy;

const bad = (m: string) => new EngineError(m);

function tokenize(text: string): string[] {
  const out: string[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < text.length) {
    const m = TOKEN.exec(text);
    if (!m) break;
    out.push(m[1] ?? m[2] ?? m[3]);
  }
  return out;
}

function diceGroup(sign: 1 | -1, tok: string, m: RegExpExecArray): GroupPlan {
  const count = m[1] === "" ? 1 : +m[1];
  const size = m[2] === "%" ? 100 : +m[2];
  if (count < 1) throw bad(`"${tok}" needs at least 1 die`);
  if (count > MAX_DICE) throw bad(`More than ${MAX_DICE} dice`);
  if (size < 1 || size > MAX_SIDES) throw bad(`"${tok}" must have 1 to ${MAX_SIDES} sides`);
  return { sign, count, size };
}

/** `>=N`, `>N`, `<=N`, `<N` on a die of `size` faces, clamped to the die; null when no face is left */
function compareRange(arg: string, size: number): Range | null {
  const m = /^([<>])(=?)(\d+)$/.exec(arg)!;
  const n = +m[3];
  const r = m[1] === ">"
    ? { min: Math.max(1, m[2] ? n : n + 1), max: size }
    : { min: 1, max: Math.min(size, m[2] ? n : n - 1) };
  return r.min <= r.max ? r : null;
}

/** The range glued to crit/miss (`bare` when there is none); it must fit the first group's die */
function rangeOf(tok: string, arg: string, bare: number, size: number): Range {
  if (/^[<>]/.test(arg)) {
    const c = compareRange(arg, size);
    if (!c) throw bad(`"${tok}" leaves no faces on the d${size}`);
    return c;
  }
  const r =arg === "" ? { min: bare, max: bare } : parseRange(arg);
  if (!r) throw bad(`"${tok}": a range goes low to high, like miss1-4`);
  if (r.min < 1 || r.max > size) throw bad(`"${tok}" is outside the d${size}'s 1 to ${size}`);
  return r;
}

/** Turn a command into a Plan, or throw an EngineError saying what is wrong. */
export function parse(input: string): Plan {
  const text = input.trim();
  const tokens = tokenize(text);
  if (tokens.length === 0) throw bad("Empty command");

  const groups: GroupPlan[] = [];
  const seen = new Set<string>();
  let modifier = 0;
  let times = 1;
  let adv = 0;
  let dis = 0;
  let critAdv = 0;
  let crit: string | null = null;
  let miss: string | null = null;
  let critTok = "";
  let missTok = "";
  let sign: 1 | -1 | null = null;
  let started = false;
  const symbol = () => (sign === 1 ? "+" : "-");

  for (const tok of tokens) {
    if (tok === "+" || tok === "-") {
      if (sign !== null) throw bad(`"${symbol()}" needs dice or a number after it`);
      sign = tok === "+" ? 1 : -1;
      continue;
    }
    const dice = DICE.exec(tok);
    if (dice || /^\d+$/.test(tok)) {
      if (started && sign === null) throw bad(`Put a + or - before "${tok}"`);
      const s = sign ?? 1;
      sign = null;
      started = true;
      if (dice) groups.push(diceGroup(s, tok, dice));
      else modifier += s * +tok;
      continue;
    }
    if (sign !== null) throw bad(`"${symbol()}" needs dice or a number after it`);
    if (/^x$/i.test(tok)) throw bad("x needs a number, like x2");
    const x = TIMES.exec(tok);
    const w = WORD.exec(tok) ?? COMPARE.exec(tok);
    if (!x && !w) throw bad(`Unknown word "${tok}"`);
    if (groups.length === 0) throw bad(`"${tok}" comes before any dice`);
    const name = x ? "x" : w![1].toLowerCase();
    if (seen.has(name)) throw bad(`${name} appears twice`);
    seen.add(name);
    const arg = x ? x[1] : w![2] ?? "";
    if (name === "x") {
      times = +arg;
      if (times < 1 || times > MAX_TIMES) throw bad(`"${tok}" must be x1 to x${MAX_TIMES}`);
    } else if (name === "crit") {
      crit = arg;
      critTok = tok;
    } else if (name === "miss") {
      miss = arg;
      missTok = tok;
    } else {
      // adv/dis/critadv never get a range: the tokenizer only glues one to crit and miss
      const n = arg === "" ? 1 : +arg;
      if (n < 1 || n > MAX_DICE) throw bad(`"${tok}" must be 1 to ${MAX_DICE}`);
      if (name === "adv") adv = n;
      else if (name === "dis") dis = n;
      else critAdv = n;
    }
  }
  if (sign !== null) throw bad(`A trailing "${symbol()}" needs dice or a number after it`);
  if (groups.length === 0) throw bad("No dice");
  if (critAdv && crit === null) throw bad("critadv needs crit");

  const size = groups[0].size;
  const critRange = crit === null ? null : rangeOf(critTok, crit, size, size);
  const missRange = miss === null ? null : rangeOf(missTok, miss, 1, size);
  if (critRange && missRange && critRange.min <= missRange.max && missRange.min <= critRange.max) {
    throw bad("crit and miss overlap");
  }
  const plan: Plan = { text, groups, modifier, times, adv, dis, crit: critRange, miss: missRange, critAdv };
  if (stageZeroSizes(plan).length > MAX_DICE) throw bad(`More than ${MAX_DICE} dice`);
  return plan;
}

/** One entry (the die's size) per die of the first throw, all repetitions; advantage dice join the first group. */
export function stageZeroSizes(plan: Plan): number[] {
  const out: number[] = [];
  const extra = Math.abs(plan.adv - plan.dis);
  for (let t = 0; t < plan.times; t++) {
    plan.groups.forEach((g, i) => {
      const n = g.count + (i === 0 ? extra : 0);
      for (let k = 0; k < n; k++) out.push(g.size);
    });
  }
  return out;
}
