import { isDice, isLanguageWord } from "./parse";
import { EngineError } from "./types";

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

function expandText(
  text: string,
  names: Record<string, string>,
  chain: string[],
  notes: string[],
): string {
  const hash = text.indexOf("#");
  const body = hash < 0 ? text : text.slice(0, hash);
  const note = hash < 0 ? "" : text.slice(hash + 1).trim();
  let out = "";
  for (const piece of body.split(/(\s+|[+-])/)) {
    const key = piece.toLowerCase();
    if (piece && has(names, key) && !/^[\s+-]/.test(piece)) {
      if (chain.includes(key)) {
        throw new EngineError("Saved names loop: " + [...chain, key].join(" → "));
      }
      // Padded so a glued sign (`nimble+3`) stays its own part; spaces collapse afterwards
      out += " " + expandText(names[key], names, [...chain, key], notes) + " ";
    } else out += piece;
    if (out.length > MAX_EXPANDED) throw new EngineError("Saved names are too long once expanded");
  }
  if (note && chain.length) notes.push(note);
  return out;
}

/**
 * Replace every whole-word saved name (case-insensitive, recursively). Text after the command's
 * own # is never expanded; a name's own # note moves to the end: command note first, then the
 * names' notes in order of use, joined by " · ".
 */
export function expand(text: string, names: Record<string, string>): string {
  const hash = text.indexOf("#");
  const cmdNote = hash < 0 ? "" : text.slice(hash + 1).trim();
  const notes: string[] = [];
  const body = expandText(hash < 0 ? text : text.slice(0, hash), names, [], notes)
    .replace(/\s+/g, " ")
    .trim();
  const all = [cmdNote, ...notes].filter(Boolean);
  const out = all.length ? (body + " # " + all.join(" · ")).trim() : body;
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
