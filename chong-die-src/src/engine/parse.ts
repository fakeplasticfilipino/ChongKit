import { parseRange } from "./range";
import {
  EngineError,
  GroupPlan,
  MAX_DICE,
  MAX_SIDES,
  MAX_TIMES,
  Plan,
} from "./types";

interface Tok {
  text: string;
  /** A range word: its + and - belong to it. */
  range?: boolean;
}
type Item = { sign: 1 | -1 } | Tok;

const DICE = /^(\d*)d(\d+|%)$/i;
const WORDS = /^(adv\d*|dis\d*|keep|low|drop|crit|each|miss|chain|explode|x\d+)$/i;

/** True for dice words: `2d6`, `d20`, `d%`. */
export function isDice(token: string): boolean {
  return DICE.test(token);
}

/** True for a word of the roll language (the only list of them), e.g. `crit`, `adv2`, `x3`. */
export function isLanguageWord(token: string): boolean {
  return WORDS.test(token);
}

const bad = (m: string) => new EngineError(m);

/** Whitespace-split; + and - split groups, except inside the range after miss/chain. */
function tokenize(body: string): Item[] {
  const items: Item[] = [];
  let prev = "";
  for (const raw of body.split(/\s+/).filter(Boolean)) {
    if ((prev === "miss" || prev === "chain") && !/^adv\d*$/i.test(raw)) {
      items.push({ text: raw, range: true });
      prev = raw.toLowerCase();
      continue;
    }
    for (const part of raw.split(/([+-])/).filter(Boolean)) {
      if (part === "+" || part === "-") {
        items.push({ sign: part === "+" ? 1 : -1 });
      } else {
        items.push({ text: part });
      }
      prev = part.toLowerCase();
    }
  }
  return items;
}

function parseGroup(sign: 1 | -1, words: Tok[]): GroupPlan {
  const m = DICE.exec(words[0].text)!;
  const count = m[1] === "" ? 1 : +m[1];
  const size = m[2] === "%" ? 100 : +m[2];
  if (count < 1) throw bad(`"${words[0].text}" needs at least 1 die`);
  if (count > MAX_DICE) throw bad(`More than ${MAX_DICE} dice`);
  if (size < 1 || size > MAX_SIDES) {
    throw bad(`"${words[0].text}" must have 1 to ${MAX_SIDES} sides`);
  }
  const g: GroupPlan = {
    sign, count, size, adv: 0, dis: 0, keep: null, drop: 0,
    crit: "none", miss: null, chain: [], chainAdv: 0, explode: false,
  };
  const num = (s: string | undefined, what: string) => {
    if (s === undefined || !/^\d+$/.test(s)) throw bad(`${what} needs a number`);
    return +s;
  };
  for (let i = 1; i < words.length; i++) {
    const w = words[i].text;
    const lw = w.toLowerCase();
    let a: RegExpExecArray | null;
    if ((a = /^adv(\d*)$/.exec(lw))) g.adv += a[1] === "" ? 1 : +a[1];
    else if ((a = /^dis(\d*)$/.exec(lw))) g.dis += a[1] === "" ? 1 : +a[1];
    else if (lw === "keep") {
      if (g.keep) throw bad("keep appears twice in one group");
      let low = false;
      if (words[i + 1]?.text.toLowerCase() === "low") {
        low = true;
        i++;
      }
      g.keep = { n: num(words[++i]?.text, "keep"), low };
    } else if (lw === "drop") {
      const n = num(words[++i]?.text, "drop");
      if (n < 1) throw bad(`"drop ${n}" must drop 1 to ${count - 1} dice`);
      g.drop += n;
    } else if (lw === "crit") {
      if (words[i + 1]?.text.toLowerCase() === "each") {
        g.crit = "each";
        i++;
      } else g.crit = "primary";
    } else if (lw === "miss" || lw === "chain") {
      const next = words[i + 1];
      if (lw === "chain" && next && /^adv\d*$/i.test(next.text)) {
        const n = /^adv(\d*)$/i.exec(next.text)![1];
        g.chainAdv += n === "" ? 1 : +n;
        i++;
        continue;
      }
      if (!next) throw bad(`${lw} needs a range`);
      const r = parseRange(next.text);
      if (!r) throw bad(`"${next.text}" is not a range`);
      i++;
      if (lw === "miss") g.miss = r;
      else g.chain.push(r);
    } else if (lw === "explode") g.explode = true;
    else throw bad(`Unknown word "${w}"`);
  }
  if (g.adv > MAX_DICE || g.dis > MAX_DICE || g.chainAdv > MAX_DICE) {
    throw bad(`More than ${MAX_DICE} dice`);
  }
  if (g.keep && !(g.keep.n >= 1 && g.keep.n <= count)) {
    throw bad(`"keep ${g.keep.n}" must keep 1 to ${count} dice`);
  }
  if (g.drop && !(g.drop >= 1 && g.drop < count)) {
    throw bad(`"drop ${g.drop}" must drop 1 to ${count - 1} dice`);
  }
  if (g.keep && g.drop) {
    throw bad("keep and drop can't be used together in one group");
  }
  if ((g.adv || g.dis) && (g.keep || g.drop)) {
    throw bad("adv or dis can't be used with keep or drop in one group");
  }
  if ((g.chain.length || g.chainAdv) && g.crit === "none") {
    throw bad("chain needs crit in the same group");
  }
  return g;
}

/** Turn a command into a Plan, or throw an EngineError saying what is wrong. */
export function parse(input: string): Plan {
  const text = input.trim();
  const hash = text.indexOf("#");
  const body = hash < 0 ? text : text.slice(0, hash);
  const note = hash < 0 ? null : text.slice(hash + 1).trim() || null;
  const items = tokenize(body);
  if (items.length === 0) throw bad("Empty command");

  // Split into segments, each led by an optional sign.
  const segs: { sign: 1 | -1; words: Tok[] }[] = [];
  let sign: 1 | -1 = 1;
  let cur: Tok[] = [];
  let signSeen = false;
  const symbol = () => (sign === 1 ? "+" : "-");
  for (const it of items) {
    if ("sign" in it) {
      if (signSeen) throw bad(`"${symbol()}" needs something after it`);
      if (cur.length) segs.push({ sign, words: cur });
      cur = [];
      sign = it.sign;
      signSeen = true;
    } else {
      cur.push(it);
      signSeen = false;
    }
  }
  const trailing = signSeen;
  if (cur.length) segs.push({ sign, words: cur });

  let times = 0;
  let modifier = 0;
  const groups: GroupPlan[] = [];
  for (const seg of segs) {
    const words: Tok[] = [];
    for (const w of seg.words) {
      const x = !w.range && /^x(\d+)$/i.exec(w.text);
      if (x) {
        if (times) throw bad("x appears twice");
        times = +x[1];
        if (times < 1 || times > MAX_TIMES) {
          throw bad(`"${w.text}" must be x1 to x${MAX_TIMES}`);
        }
      } else words.push(w);
    }
    if (!words.length) continue;
    const first = words[0].text;
    if (/^\d+$/.test(first)) {
      if (words.length > 1) throw bad(`Unexpected "${words[1].text}" after ${first}`);
      modifier += seg.sign * +first;
    } else if (isDice(first)) {
      groups.push(parseGroup(seg.sign, words));
    } else if (isLanguageWord(first)) {
      throw bad(`"${first}" comes before any dice`);
    } else {
      throw bad(`"${first}" is not dice or a word`);
    }
  }
  if (trailing) throw bad(`A trailing "${symbol()}" needs something after it`);
  if (!groups.length) throw bad("No dice");
  let total = 0;
  for (const g of groups) total += g.count + Math.abs(g.adv - g.dis);
  if (total * (times || 1) > MAX_DICE) throw bad(`More than ${MAX_DICE} dice`);
  const plan: Plan = { text, groups, modifier, times: times || 1, note };
  if (stageZeroSizes(plan).length > MAX_DICE) throw bad(`More than ${MAX_DICE} dice`);
  return plan;
}

/** One entry (the die's size) per die of the first throw, all repetitions. */
export function stageZeroSizes(plan: Plan): number[] {
  const out: number[] = [];
  for (let t = 0; t < plan.times; t++) {
    for (const g of plan.groups) {
      const n = g.count + Math.abs(g.adv - g.dis);
      for (let i = 0; i < n; i++) out.push(g.size);
    }
  }
  return out;
}
