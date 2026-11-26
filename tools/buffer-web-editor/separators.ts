/**
 * Line separators the page does not show. CodeMirror splits a document on
 * `\n`, `\r\n` and `\r` alike and joins it with `\n`, so the page holds LF
 * only and remembers which breaks were really `\r\n` or `\r`. The host keeps
 * its text byte-exact: everything that crosses the bridge (offsets, inserted
 * text, checkpoints) is translated through this map, so a CRLF is two units
 * to the host and one to the page. Pure functions; the editor state that
 * carries the map lives in `line-separators.ts`.
 */

/** A break that was not a plain LF: where its `\n` sits in the page, and what it really is. */
export type Break = readonly [position: number, kind: '\r\n' | '\r'];

const SEPARATOR = /\r\n|\r/g;

/** Host text as the page shows it, and the breaks that were not LF. */
export const splitSeparators = (
  raw: string
): { text: string; breaks: Break[] } => {
  if (!raw.includes('\r')) {
    return { text: raw, breaks: [] };
  }
  const breaks: Break[] = [];
  let text = '';
  let last = 0;
  for (const match of raw.matchAll(SEPARATOR)) {
    text += raw.slice(last, match.index) + '\n';
    breaks.push([text.length - 1, match[0] as Break[1]]);
    last = match.index + match[0].length;
  }
  return { text: text + raw.slice(last), breaks };
};

/** Page text `[from, to)` as the host holds it: each remembered break restored. */
export const restoreSeparators = (
  text: string,
  breaks: readonly Break[],
  from = 0,
  to = text.length
): string => {
  let out = '';
  let last = from;
  for (const [position, kind] of breaks) {
    if (position >= from && position < to) {
      out += text.slice(last, position) + kind;
      last = position + 1;
    }
  }
  return out + text.slice(last, to);
};

/** A page offset in host units: every CRLF before it adds one. */
export const toHostOffset = (
  breaks: readonly Break[],
  offset: number
): number => {
  let host = offset;
  for (const [position, kind] of breaks) {
    if (position >= offset) {
      break;
    }
    host += kind.length - 1;
  }
  return host;
};

/** A host offset in page units. One between a `\r` and its `\n` lands before the pair. */
export const toPageOffset = (
  breaks: readonly Break[],
  offset: number
): number => {
  let extra = 0;
  for (const [position, kind] of breaks) {
    const start = position + extra;
    if (offset <= start) {
      break;
    }
    if (offset < start + kind.length) {
      return position;
    }
    extra += kind.length - 1;
  }
  return offset - extra;
};

/**
 * The breaks after `[from, to)` of the pre-edit page becomes text of
 * `insertedLength`: breaks inside the range go, later ones shift. Breaks the
 * inserted text brings are added by the caller (see `withBreaks`).
 */
export const mapBreaks = (
  breaks: readonly Break[],
  from: number,
  to: number,
  insertedLength: number
): Break[] => {
  const delta = insertedLength - (to - from);
  const mapped: Break[] = [];
  for (const [position, kind] of breaks) {
    if (position < from) {
      mapped.push([position, kind]);
    } else if (position >= to) {
      mapped.push([position + delta, kind]);
    }
  }
  return mapped;
};

/** Breaks in document order after adding more. */
export const withBreaks = (
  breaks: readonly Break[],
  added: readonly Break[]
): Break[] =>
  added.length === 0
    ? [...breaks]
    : [...breaks, ...added].sort((a, b) => a[0] - b[0]);
