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

const buildParagraphs = (): readonly PreviewRun[] => {
  const runs: PreviewRun[] = [];
  let length = 0;
  for (let i = 0; length < STRESS_FIXTURE_LENGTH; i += 1) {
    const text = paragraph(i).slice(0, STRESS_FIXTURE_LENGTH - length);
    runs.push({ author: authorOf(i), text });
    length += text.length;
  }
  return runs;
};

/** The 30,000-character document: opening, one ending, no siblings. */
export const stressPreview = (): PreviewState => {
  const runs = buildParagraphs();
  const middle = Math.floor(runs.length / 2);
  return {
    prefix: runs.slice(0, middle),
    suffixes: [runs.slice(middle)],
    index: 0,
  };
};
