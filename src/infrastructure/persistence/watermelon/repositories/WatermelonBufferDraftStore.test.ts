import { bufferFixture } from './buffer-mutation-fixture';

test('conflicted draft is kept for recovery', async () => {
  const f = await bufferFixture();
  const draft = await f.draft();
  await f.bufferDraftStore.put(draft);
  expect(
    await f.bufferDraftStore.get(f.treeId, f.pathId, [], draft.expectedRevision)
  ).toEqual({ draft, conflicted: true });
  expect(
    await f.bufferDraftStore.get(
      f.treeId,
      f.pathId,
      draft.expectedSequence,
      draft.expectedRevision
    )
  ).toEqual({ draft, conflicted: false });
  await f.treeRepo.hardDelete(f.treeId);
  expect(await f.bufferDraftStore.get(f.treeId, f.pathId, [], 0)).toBeNull();
});

test('acknowledging an older snapshot preserves newer typing', async () => {
  const f = await bufferFixture();
  const old = await f.draft();
  const latest = { ...old, workingTail: 'new text' };
  await f.bufferDraftStore.put(latest);
  await f.bufferDraftStore.remove(f.treeId, f.pathId, old);
  expect(
    (await f.bufferDraftStore.get(f.treeId, f.pathId, [], 0))?.draft
  ).toEqual(latest);
});
