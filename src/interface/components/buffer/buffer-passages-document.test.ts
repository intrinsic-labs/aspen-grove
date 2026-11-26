import { id } from '@application/services/buffer/buffer-graph-fixtures';
import { documentText, applyEdits } from './buffer-preview-document';
import {
  caretOnReload,
  passageIndexAt,
  previewFromPassages,
  rebaseTyping,
} from './buffer-passages-document';

const passages = [
  { nodeId: id('root'), text: 'Once. ', author: 'human' as const },
  { nodeId: id('sea'), text: 'The sea was calm.', author: 'model' as const },
  {
    nodeId: id('edit'),
    text: ' It was very quiet.',
    author: 'human' as const,
    ancestorText: ' It was quiet.',
  },
];

test('passages become the document the reducer edits, ids and colors intact', () => {
  const doc = previewFromPassages(passages);
  expect(doc.index.document.passages.map((p) => p.id)).toEqual([
    id('root'),
    id('sea'),
    id('edit'),
  ]);
  expect(documentText(doc)).toBe('Once. The sea was calm. It was very quiet.');
  expect(doc.index.document.passages[0].runs).toEqual([
    { author: 'human', text: 'Once. ' },
  ]);
  expect(doc.index.document.passages[1].runs).toEqual([
    { author: 'model', text: 'The sea was calm.' },
  ]);
  const colored = doc.index.document.passages[2].runs;
  expect(colored.some((r) => r.author === 'model')).toBe(true);
  expect(colored.find((r) => r.text.includes('very'))?.author).toBe('human');
  expect(doc.ancestors[id('sea')]).toEqual([
    { author: 'model', text: 'The sea was calm.' },
  ]);
  expect(doc.ancestors[id('edit')]).toEqual([
    { author: 'model', text: ' It was quiet.' },
  ]);
  expect(doc.ancestors[id('root')]).toBeUndefined();
});

test('the caret belongs to the passage typing would land in', () => {
  const doc = previewFromPassages(passages);
  expect(passageIndexAt(doc, 3)).toBe(0);
  expect(passageIndexAt(doc, 10)).toBe(1);
  expect(passageIndexAt(doc, documentText(doc).length)).toBe(2);
  expect(passageIndexAt(previewFromPassages([passages[0]]), 0)).toBe(0);
});

test('typing after a snapshot is carried onto the reloaded document', () => {
  const snapshot = previewFromPassages(passages);
  const reloaded = previewFromPassages(passages);
  const end = documentText(snapshot).length;
  const current = applyEdits(snapshot, [
    { start: end, end, inserted: ' Gulls.' },
  ]);
  const rebased = rebaseTyping(reloaded, snapshot, current);
  expect(documentText(rebased)).toBe(documentText(current));
  expect(rebaseTyping(reloaded, snapshot, snapshot)).toBe(reloaded);
});

test('after a switch the caret stays in the passage that was switched', () => {
  const before = previewFromPassages(passages);
  const inMiddle = 10;
  expect(passageIndexAt(before, inMiddle)).toBe(1);

  // The middle passage comes back shorter, then longer, then empty.
  for (const text of ['Sea.', 'The sea was calm, and then it was not.', '']) {
    const reloaded = previewFromPassages([
      passages[0],
      { ...passages[1], text },
      passages[2],
    ]);
    const kept = caretOnReload(inMiddle, reloaded, 1);
    // Without this the pill would fall back to the leaf and vanish.
    expect(passageIndexAt(reloaded, kept as number)).toBe(text ? 1 : 2);
    expect(kept).toBeLessThanOrEqual(reloaded.index.length);
  }
  expect(caretOnReload(undefined, before, 1)).toBeUndefined();
  expect(caretOnReload(inMiddle, before)).toBe(inMiddle);
  expect(caretOnReload(999, before)).toBe(before.index.length);
});
