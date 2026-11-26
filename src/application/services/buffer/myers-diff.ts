/**
 * Matches what two token sequences share, for authorship against an
 * ancestor. Myers' O(ND) pass finds the edit distance D first, in linear
 * space. The optimal alignments all stay within D diagonals of the main one,
 * so the table that settles ties only needs that band: cost grows with the
 * length times D, not with the product of the lengths. A long passage with a
 * few edits is exact where a full table would not fit.
 *
 * Ties are leftmost: where the same number of tokens could match in several
 * places, the earliest place in `current` wins. The common prefix is trimmed
 * first for that reason, and the common suffix is deliberately not (trimming
 * it would prefer the rightmost match).
 *
 * Bounded: past `maxEdits`, or when the band would exceed `MAX_BAND_CELLS`,
 * the diff degrades to the common ends. That is never wrong text, only fewer
 * matches.
 */
export const DEFAULT_MAX_EDITS = 2000;

/** The band's size cap in table cells (4 bytes each). */
export const MAX_BAND_CELLS = 8_000_000;

/** The edit distance (insertions plus deletions), or -1 beyond `limit`. */
const editDistance = (
  ancestor: readonly string[],
  current: readonly string[],
  from: number,
  limit: number
): number => {
  const n = ancestor.length - from;
  const m = current.length - from;
  const offset = limit + 1;
  const frontier = new Int32Array(2 * limit + 3);
  for (let d = 0; d <= limit; d += 1) {
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d ||
        (k !== d && frontier[offset + k - 1] < frontier[offset + k + 1])
          ? frontier[offset + k + 1]
          : frontier[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && ancestor[from + x] === current[from + y]) {
        x += 1;
        y += 1;
      }
      frontier[offset + k] = x;
      if (x >= n && y >= m) {
        return d;
      }
    }
  }
  return -1;
};

/** For each token of `current`, the index of its match in `ancestor`, or -1. */
export const matchTokens = (
  ancestor: readonly string[],
  current: readonly string[],
  maxEdits: number = DEFAULT_MAX_EDITS
): Int32Array => {
  const matches = new Int32Array(current.length).fill(-1);
  let head = 0;
  while (
    head < ancestor.length &&
    head < current.length &&
    ancestor[head] === current[head]
  ) {
    matches[head] = head;
    head += 1;
  }
  const a = ancestor.slice(head);
  const b = current.slice(head);
  if (a.length === 0 || b.length === 0) {
    return matches;
  }
  const edits = editDistance(
    ancestor,
    current,
    head,
    Math.min(a.length + b.length, maxEdits)
  );
  const width = 2 * edits + 1;
  if (edits < 0 || (a.length + 1) * width > MAX_BAND_CELLS) {
    return endsOnly(ancestor, current, matches, head);
  }
  // table[i * width + k + edits] is the longest common subsequence of a[i..]
  // and b[i - k..], for the diagonals k = i - j within the band.
  const table = new Int32Array((a.length + 1) * width).fill(-1);
  const read = (i: number, j: number): number => {
    const k = i - j;
    return k < -edits || k > edits || j < 0 || j > b.length
      ? -1
      : table[i * width + k + edits];
  };
  for (let i = a.length; i >= 0; i -= 1) {
    for (let k = -edits; k <= edits; k += 1) {
      const j = i - k;
      if (j < 0 || j > b.length) {
        continue;
      }
      table[i * width + k + edits] =
        i === a.length || j === b.length
          ? 0
          : a[i] === b[j]
            ? read(i + 1, j + 1) + 1
            : Math.max(read(i + 1, j), read(i, j + 1));
    }
  }
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      matches[head + j] = head + i;
      i += 1;
      j += 1;
    } else if (read(i + 1, j) >= read(i, j + 1)) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return matches;
};

/**
 * The fallback: the common suffix of the unmatched middle, nothing between.
 * `head` tokens at the start are already matched and are not reused.
 */
const endsOnly = (
  ancestor: readonly string[],
  current: readonly string[],
  matches: Int32Array,
  head: number
): Int32Array => {
  let tail = 0;
  const free = Math.min(ancestor.length, current.length) - head;
  while (
    tail < free &&
    matches[current.length - 1 - tail] < 0 &&
    ancestor[ancestor.length - 1 - tail] === current[current.length - 1 - tail]
  ) {
    matches[current.length - 1 - tail] = ancestor.length - 1 - tail;
    tail += 1;
  }
  return matches;
};
