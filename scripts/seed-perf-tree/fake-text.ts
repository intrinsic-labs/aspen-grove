import { createRng, hashString } from './rng.ts';

const WORDS = (
  'amber bridge cascade drift ember fable glimmer harbor island juniper ' +
  'kindle lantern meadow nimbus orchard pebble quiet river signal thicket ' +
  'umbra valley willow yonder zephyr branch canopy lattice thread weave ' +
  'context fork prune trace anchor echo margin vector'
).split(' ');

const CODE = [
  '```ts\nconst sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);\n```',
  '```python\nfor i, word in enumerate(words):\n    print(i, word)\n```',
  '```bash\nnpm run test -- --watch=false\n```',
];

const sentence = (next: () => number): string => {
  const len = 6 + Math.floor(next() * 10);
  const words = Array.from(
    { length: len },
    () => WORDS[Math.floor(next() * WORDS.length)]
  );
  return `${words[0][0].toUpperCase()}${words[0].slice(1)} ${words.slice(1).join(' ')}.`;
};

/** Lorem-style model reply of roughly `targetTokens`, derived only from `key`. */
export const fakeReply = (key: string, targetTokens: number): string => {
  const rng = createRng(hashString(key));
  const wordBudget = Math.max(12, Math.round(targetTokens * 0.75));
  const paragraphs: string[] = [];
  let words = 0;
  while (words < wordBudget) {
    const kind = rng.next();
    let block: string;
    if (kind < 0.12) {
      block = rng.pick(CODE);
    } else if (kind < 0.3) {
      block = Array.from(
        { length: rng.int(3, 5) },
        () => `- ${sentence(rng.next)}`
      ).join('\n');
    } else if (kind < 0.36) {
      block = `## ${sentence(rng.next).replace('.', '')}`;
    } else {
      block = Array.from({ length: rng.int(2, 4) }, () =>
        sentence(rng.next)
      ).join(' ');
    }
    words += block.split(/\s+/).length;
    paragraphs.push(block);
  }
  return paragraphs.join('\n\n');
};
