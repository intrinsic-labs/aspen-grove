/**
 * Deterministic reply text. The same request number and prompt always give
 * the same tokens, and consecutive requests (parallel cards) differ.
 */
const VOCABULARY = [
  'the', 'loom', 'branch', 'river', 'quiet', 'signal', 'model', 'thread',
  'aspen', 'grove', 'light', 'pattern', 'weaves', 'under', 'every', 'leaf',
  'slowly', 'turns', 'toward', 'another', 'path', 'and', 'remembers', 'its',
  'roots', 'while', 'wind', 'carries', 'small', 'words', 'across', 'water',
] as const;

const HEAD_TOKENS = 3;

export const hashText = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * `count` tokens: "Mock reply #<n>." then seeded words, a full stop every
 * 12 words (the next word capitalised) and a paragraph break every 48. Each token but the first carries
 * its leading space (none after a paragraph break), so joining them gives
 * the reply.
 */
export const replyTokens = (input: {
  readonly requestNumber: number;
  readonly prompt: string;
  readonly count: number;
}): string[] => {
  const { requestNumber, prompt, count } = input;
  const head = ['Mock', 'reply', `#${requestNumber}.`];
  let state = (hashText(prompt) ^ Math.imul(requestNumber, 2654435761)) >>> 0;
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i < HEAD_TOKENS) {
      words.push(head[i]);
      continue;
    }
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const previous = words[words.length - 1];
    const lower = VOCABULARY[state % VOCABULARY.length];
    const word = previous.endsWith('.') || previous.endsWith('\n')
      ? lower[0].toUpperCase() + lower.slice(1)
      : lower;
    const index = i - HEAD_TOKENS;
    const sentenceEnd = index % 12 === 11;
    const paragraphEnd = index % 48 === 47;
    words.push(`${word}${sentenceEnd ? '.' : ''}${paragraphEnd ? '\n\n' : ''}`);
  }
  return words.map((word, i) =>
    i === 0 || words[i - 1].endsWith('\n') ? word : ` ${word}`
  );
};

/** The text a request is "about" (its last message), used as the seed. */
export const lastMessageText = (messages: unknown): string => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return '';
  }
  const content = (messages[messages.length - 1] as { content?: unknown })
    ?.content;
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        const text = (part as { text?: unknown })?.text;
        return typeof text === 'string' ? text : '';
      })
      .join('');
  }
  return '';
};
