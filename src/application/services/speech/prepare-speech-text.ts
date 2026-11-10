/** What Latent Spaces says in place of each fenced code block. */
export const CODE_BLOCK_SPEECH =
  'You can see the code on this loom tree branch.';

/**
 * A closed fence: three backticks, an optional language tag, the code and the
 * closing three backticks. An unclosed fence (still streaming, or malformed)
 * is left as prose, as in Latent Spaces.
 */
const CLOSED_CODE_FENCE = /```[^\n`]*[\s\S]*?```/g;

/**
 * Collapses runs of blank lines to one and trims leading and trailing blank
 * lines (Latent Spaces' `ContentParser.trimExtraNewlines`).
 */
const trimExtraNewlines = (text: string): string => {
  const result: string[] = [];
  let consecutiveEmptyLines = 0;

  for (const line of text.split('\n')) {
    if (line.trim().length === 0) {
      consecutiveEmptyLines += 1;
      if (consecutiveEmptyLines <= 1) {
        result.push('');
      }
    } else {
      result.push(line);
      consecutiveEmptyLines = 0;
    }
  }

  while (result.length > 0 && result[0] === '') result.shift();
  while (result.length > 0 && result[result.length - 1] === '') result.pop();

  return result.join('\n');
};

/**
 * The text a node is read aloud as: prose as written, each fenced code block
 * replaced by a sentence pointing at the branch (Latent Spaces'
 * `SpeechSynthesizer.speak(node:)`).
 */
export const prepareSpeechText = (content: string): string => {
  const text = content.replace(/\r\n/g, '\n');
  const parts: string[] = [];
  let lastEnd = 0;

  for (const match of text.matchAll(CLOSED_CODE_FENCE)) {
    const start = match.index ?? 0;
    parts.push(trimExtraNewlines(text.slice(lastEnd, start)));
    parts.push(`\n${CODE_BLOCK_SPEECH}\n`);
    lastEnd = start + match[0].length;
  }
  parts.push(trimExtraNewlines(text.slice(lastEnd)));

  return parts.join('').trim();
};
