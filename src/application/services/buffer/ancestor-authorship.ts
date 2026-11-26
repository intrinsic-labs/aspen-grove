import {
  type AuthorshipRun,
  alignRunsToClusters,
  coalesce,
  runsText,
} from './authorship-runs';
import { matchTokens } from './myers-diff';
import { tokenize } from './text-tokens';

/**
 * The authorship of a passage that descends from earlier text: what still
 * matches the earliest ancestor keeps the ancestor's author, everything else
 * is the human's. The diff runs over word tokens (words, whitespace and
 * punctuation runs), so a token that changed at all is the human's whole:
 * "delta" typed over "beta" is not half model for the letters they share.
 *
 * It is deterministic and leftmost: where the ancestor's text could match in
 * several places, the earliest place in the current text wins. It is exact
 * up to the diff's edit bound (see `matchTokens`), far past what a passage
 * of model output needs, and degrades to common ends beyond it.
 */
export const reconcileRuns = (
  ancestor: readonly AuthorshipRun[],
  currentText: string,
  maxEdits?: number
): readonly AuthorshipRun[] => {
  const ancestorText = runsText(ancestor);
  const isModel = new Uint8Array(ancestorText.length);
  let at = 0;
  for (const run of ancestor) {
    if (run.author === 'model') {
      isModel.fill(1, at, at + run.text.length);
    }
    at += run.text.length;
  }
  const before = tokenize(ancestorText);
  const after = tokenize(currentText);
  const matches = matchTokens(before, after, maxEdits);
  const starts: number[] = [];
  let offset = 0;
  for (const token of before) {
    starts.push(offset);
    offset += token.length;
  }
  const pieces: AuthorshipRun[] = [];
  let position = 0;
  after.forEach((token, index) => {
    const from = matches[index] < 0 ? -1 : starts[matches[index]];
    for (let i = 0; i < token.length; i += 1) {
      pieces.push({
        author: from >= 0 && isModel[from + i] === 1 ? 'model' : 'human',
        text: currentText[position + i],
      });
    }
    position += token.length;
  });
  return alignRunsToClusters(coalesce(pieces));
};

/** The common case: an ancestor that is all the model's. */
export const reconcileWithAncestor = (
  ancestorText: string,
  currentText: string
): readonly AuthorshipRun[] =>
  reconcileRuns([{ author: 'model', text: ancestorText }], currentText);
