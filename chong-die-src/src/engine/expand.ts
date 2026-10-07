import { isDice, isLanguageWord } from "./parse";
import { EngineError } from "./types";

/** Names that come with the tool. */
export const BUILT_IN_NAMES: Record<string, string> = { nimble: "crit miss 1" };

const MAX_EXPANDED = 10000;
const NAME = /^[a-z][a-z0-9_]*$/i;

/** Null if `name` can be saved, else why not. */
export function checkName(name: string): string | null {
  if (!NAME.test(name)) return "A name starts with a letter, then letters, digits or _";
  if (isLanguageWord(name)) return `"${name}" is a word of the roll language`;
  if (isDice(name)) return `"${name}" looks like dice`;
  return null;
}

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

function expandText(text: string, names: Record<string, string>, chain: string[]): string {
  const hash = text.indexOf("#");
  const body = hash < 0 ? text : text.slice(0, hash);
  const rest = hash < 0 ? "" : text.slice(hash);
  let out = "";
  for (const piece of body.split(/(\s+|[+-])/)) {
    const key = piece.toLowerCase();
    if (piece && has(names, key) && !/^[\s+-]/.test(piece)) {
      if (chain.includes(key)) {
        throw new EngineError(`Saved names loop: ${[...chain, key].join(" → ")}`);
      }
      out += expandText(names[key], names, [...chain, key]);
    } else out += piece;
    if (out.length > MAX_EXPANDED) throw new EngineError("Saved names are too long once expanded");
  }
  return out + rest;
}

/** Replace every whole-word saved name (case-insensitive, recursively); text after `#` is left alone. */
export function expand(text: string, names: Record<string, string>): string {
  const out = expandText(text, names, []).replace(/\s+/g, " ").trim();
  if (out.length > MAX_EXPANDED) throw new EngineError("Saved names are too long once expanded");
  return out;
}

/** `atk = 1d10 crit` → { name, text }; `atk =` has empty text (delete). Not a definition → null. */
export function parseDefinition(text: string): { name: string; text: string } | null {
  const eq = text.indexOf("=");
  if (eq < 0) return null;
  const name = text.slice(0, eq).trim();
  if (!NAME.test(name)) return null;
  return { name: name.toLowerCase(), text: text.slice(eq + 1).trim() };
}
