import { createULID } from '@domain/value-objects';
// This integration suite drives the application through its real persistence ports.
// eslint-disable-next-line boundaries/element-types
import { bufferOpenFixture } from '@infrastructure/persistence/watermelon/repositories/buffer-open-fixture';
import { draftFromDocument } from '@application/services/buffer/draft-from-document';
import { reserveBufferDraft } from '@application/services/buffer/reserve-buffer-draft';
import { settleStoredDraft } from '@application/services/buffer/settle-stored-draft';
import type { OpenedBufferDocument } from './OpenBufferDocumentUseCase';

const seeded = async () => {
  const f = await bufferOpenFixture();
  const model = await f.addNode('The sea was calm.', {
    parents: [f.root],
    onPath: true,
  });
  return { f, model };
};

/** A reserved draft that types ` Then rain.` at the end of the opened text. */
const typedDraft = async (
  opened: OpenedBufferDocument,
  tail = ' Then rain.'
) => {
  const text = draftFromDocument(opened, {
    passages: [],
    tail: [{ author: 'human', text: tail }],
  })!;
  return reserveBufferDraft(opened.graph, opened.path, text, {
    newId: createULID,
    now: Date.now,
    selections: opened.selections,
  });
};

test('open resolves the stored path with its passages and revision', async () => {
  const { f, model } = await seeded();
  const opened = await f.open.execute({ treeId: f.treeId });
  expect(opened.pathId).toBe(f.pathId);
  expect(opened.ownerAgentId).toBe(f.ownerAgentId);
  expect(opened.path.nodeIds).toEqual([f.root, model]);
  expect(opened.passages).toEqual([
    { nodeId: f.root, text: '', author: 'human' },
    { nodeId: model, text: 'The sea was calm.', author: 'model' },
  ]);
  expect(opened.revision).toBe(
    (await f.pathRepo.findById(f.pathId))!.updatedAt.getTime()
  );
  expect(opened.headOperationId).toBe(
    (await f.pathRepo.getNodeSequence(f.pathId))[0].id
  );
  expect(opened.choices).toHaveLength(2);
  expect(opened.issues).toEqual([]);
  expect(opened.storedDraft).toBeNull();

  // The revision is the writer's own token: a draft built from it commits.
  const draft = await typedDraft(opened);
  const result = await f.commit.execute({
    treeId: f.treeId,
    pathId: f.pathId,
    draft,
  });
  expect(result.nodeIds).toHaveLength(3);
});

test('open reports a tree it cannot open instead of guessing', async () => {
  const { f } = await seeded();
  await expect(f.open.execute({ treeId: createULID() })).rejects.toThrow();
});

test('a stored matching draft replays and clears on open', async () => {
  const { f } = await seeded();
  const opened = await f.open.execute({ treeId: f.treeId });
  await f.bufferDraftStore.put(await typedDraft(opened));
  const again = await f.open.execute({ treeId: f.treeId });
  expect(again.storedDraft?.conflicted).toBe(false);

  const outcome = await settleStoredDraft(again.storedDraft, (draft) =>
    f.commit.execute({ treeId: f.treeId, pathId: f.pathId, draft })
  );
  expect(outcome).toEqual({ kind: 'applied' });
  expect((await f.open.execute({ treeId: f.treeId })).storedDraft).toBeNull();
  expect(await f.sequence()).toHaveLength(3);
});

test('a lost acknowledgement comes back already applied and clears', async () => {
  const { f } = await seeded();
  const opened = await f.open.execute({ treeId: f.treeId });
  const draft = await typedDraft(opened);
  await f.bufferDraftStore.put(draft);
  jest
    .spyOn(f.bufferDraftStore, 'remove')
    .mockRejectedValueOnce(new Error('cleanup failure'));
  await expect(
    f.commit.execute({ treeId: f.treeId, pathId: f.pathId, draft })
  ).rejects.toThrow('cleanup failure');
  const before = await f.counts();

  const reopened = await f.open.execute({ treeId: f.treeId });
  // The store cannot tell: the path moved on, so it calls the draft conflicted.
  expect(reopened.storedDraft?.conflicted).toBe(true);
  const outcome = await settleStoredDraft(reopened.storedDraft, (stored) =>
    f.commit.execute({ treeId: f.treeId, pathId: f.pathId, draft: stored })
  );
  expect(outcome).toEqual({ kind: 'applied' });
  expect(await f.counts()).toEqual(before);
  expect((await f.open.execute({ treeId: f.treeId })).storedDraft).toBeNull();
});

test('a conflicted draft is kept and offered for recovery', async () => {
  const { f } = await seeded();
  const opened = await f.open.execute({ treeId: f.treeId });
  const stale = await typedDraft(opened, ' typed on an old screen');
  await f.bufferDraftStore.put(stale);
  // Another session commits first, so the stored draft no longer fits.
  await f.commit.execute({
    treeId: f.treeId,
    pathId: f.pathId,
    draft: await typedDraft(opened, ' other session'),
  });
  const before = await f.counts();
  const reopened = await f.open.execute({ treeId: f.treeId });
  expect(reopened.storedDraft?.conflicted).toBe(true);

  const outcome = await settleStoredDraft(reopened.storedDraft, (draft) =>
    f.commit.execute({ treeId: f.treeId, pathId: f.pathId, draft })
  );
  expect(outcome).toMatchObject({ kind: 'recover', reason: 'conflicted' });
  expect(await f.counts()).toEqual(before);
  expect(
    (await f.open.execute({ treeId: f.treeId })).storedDraft?.draft.workingTail
  ).toBe(' typed on an old screen');
});

// When the stored rows stop short of a leaf, open resolves (and the editor
// shows) a longer path; the commit still checks the durable rows.
test('a stored sequence that open extends can still be committed', async () => {
  const f = await bufferOpenFixture();
  const leaf = await f.addNode('Unlinked from the stored rows.', {
    parents: [f.root],
  });
  const opened = await f.open.execute({ treeId: f.treeId });
  expect(opened.sequence).toEqual([f.root, leaf]);
  expect(opened.issues.map((issue) => issue.kind)).toContain(
    'sequence-extended'
  );
  expect(await f.sequence()).toEqual([f.root]);
  const draft = await typedDraft(opened);
  await expect(
    f.commit.execute({ treeId: f.treeId, pathId: f.pathId, draft })
  ).resolves.toBeDefined();
});
