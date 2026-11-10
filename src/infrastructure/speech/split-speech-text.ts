/**
 * Splits text into pieces no longer than `maxLength`, for speech engines with
 * an input limit (Android's TextToSpeech takes at most about 4,000
 * characters per utterance). Pieces break at the last sentence end, else the
 * last whitespace, else hard at the limit, so long replies are read whole
 * instead of failing.
 */
export const splitSpeechText = (
  text: string,
  maxLength: number
): readonly string[] => {
  if (
    !Number.isFinite(maxLength) ||
    maxLength <= 0 ||
    text.length <= maxLength
  ) {
    return [text];
  }
  const pieces: string[] = [];
  let rest = text;
  while (rest.length > maxLength) {
    const cut = findCut(rest.slice(0, maxLength));
    const piece = rest.slice(0, cut).trim();
    if (piece) {
      pieces.push(piece);
    }
    rest = rest.slice(cut).trimStart();
  }
  if (rest.trim()) {
    pieces.push(rest.trim());
  }
  return pieces;
};

const SENTENCE_END = /[.!?…](?=\s)|\n/g;

/** Where to end a piece inside `window` (its length is the limit). */
const findCut = (window: string): number => {
  let sentenceCut = -1;
  for (const match of window.matchAll(SENTENCE_END)) {
    sentenceCut = match.index + match[0].length;
  }
  if (sentenceCut > window.length / 2) {
    return sentenceCut;
  }
  const space = window.search(/\s\S*$/);
  return space > 0 ? space + 1 : window.length;
};
