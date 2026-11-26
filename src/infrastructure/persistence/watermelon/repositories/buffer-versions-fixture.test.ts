import { importBufferVersions } from './buffer-versions-import';

test('the buffer-versions fixture imports as a buffer tree that opens with a sibling at the leaf', async () => {
  const { open, treeId, treeRepo } = await importBufferVersions();
  expect((await treeRepo.findById(treeId))!.mode).toBe('buffer');
  const opened = await open.execute({ treeId });
  expect(opened.issues).toEqual([]);
  expect(opened.passages.map((p) => [p.author, p.text])).toEqual([
    ['human', ''],
    ['human', 'The kettle was already warm'],
    ['model', ' when I came down, and the window over the sink had fogged.'],
    ['model', ' Snow was still falling on the yard.'],
  ]);
  const last = opened.choices[opened.choices.length - 1];
  expect(last.branches.entries).toHaveLength(2);
  expect(last.branches.active).toBe(0);
});
