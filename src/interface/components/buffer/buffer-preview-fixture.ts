import type { PreviewAuthor, PreviewRun, PreviewState } from './buffer-preview';

/**
 * The long-document review fixture: exactly 30,000 characters in about a
 * hundred alternating human and model paragraphs, split at the middle into
 * the opening and a single ending so edits near the top, the middle (across
 * the seam) and the end can be driven. Every paragraph opens with its number
 * and author, which makes any screenful of it identifiable on screen.
 */
export const STRESS_FIXTURE_LENGTH = 30_000;

const SENTENCES: readonly string[] = [
  'The kettle sang low while the lamps along the harbour came on one by one.',
  'Nobody hurried; the tide kept its own counsel and the gulls kept theirs.',
  'She wrote the date in the margin, then crossed it out and wrote it again.',
  'Somewhere a door opened onto weather, and the whole house leaned to listen.',
  'He counted the stairs the way other people count sheep, and lost his place.',
];

const PARAGRAPH_LENGTH = 300;

const authorOf = (index: number): PreviewAuthor =>
  index % 3 === 0 ? 'human' : 'model';

const paragraph = (index: number): string => {
  const head = `Paragraph ${String(index + 1).padStart(3, '0')} ${authorOf(index)}. `;
  let body = '';
  for (let i = index; head.length + body.length < PARAGRAPH_LENGTH; i += 1) {
    body += `${SENTENCES[i % SENTENCES.length]} `;
  }
  return head + body;
};

const buildParagraphs = (total: number): readonly PreviewRun[] => {
  const runs: PreviewRun[] = [];
  let length = 0;
  for (let i = 0; length < total; i += 1) {
    const text = paragraph(i).slice(0, total - length);
    runs.push({ author: authorOf(i), text });
    length += text.length;
  }
  return runs;
};

/** The lengths the responsiveness measurements run at (developer preview). */
export const STRESS_FIXTURE_SIZES = [5_000, 10_000, 20_000, 30_000] as const;

/**
 * The long document, `length` characters of it (30,000 by default): opening,
 * one ending, no siblings. A shorter one is the same text cut off, so every
 * size opens with "Paragraph 001 human."
 */
export const stressPreview = (
  length: number = STRESS_FIXTURE_LENGTH
): PreviewState => {
  const runs = buildParagraphs(length);
  const middle = Math.floor(runs.length / 2);
  return {
    prefix: runs.slice(0, middle),
    suffixes: [runs.slice(middle)],
    index: 0,
  };
};
