import { createLocalId, createULID } from '@domain/value-objects';
// This integration suite drives the application through its real persistence ports.
// eslint-disable-next-line boundaries/element-types
import { bufferFixture } from '@infrastructure/persistence/watermelon/repositories/buffer-mutation-fixture';

test('two stale sessions cannot overwrite a path', async () => {
  const f = await bufferFixture();
  const a = await f.draft(),
    b = await f.draft({ workingTail: 'stale' });
  const [first, second] = await Promise.allSettled(
    [a, b].map((draft) => f.commit.execute({ ...f, draft }))
  );
  expect(first.status).toBe('fulfilled');
  expect(second).toMatchObject({
    status: 'rejected',
    reason: expect.any(Error),
  });
  expect(await f.sequence()).toEqual([a.nodeIds[0], f.child]);
});

test('commit then reopen resolves the edited text', async () => {
  const f = await bufferFixture();
  const draft = await f.draft();
  const result = await f.commit.execute({ ...f, draft });
  const reopened = await f.reopen();
  expect(reopened).toEqual(result);
  expect((await f.nodeRepo.findById(reopened.nodeIds[0]))?.content).toEqual({
    type: 'text',
    text: 'edited',
  });
});

test('switch to original and back keeps both versions', async () => {
  const f = await bufferFixture();
  const draft = await f.draft();
  const switched = await f.switchPath.execute({
    ...f,
    draft,
    action: { kind: 'version', position: 0, nodeId: f.root },
  });
  expect(switched.nodeIds).toEqual([f.root, f.child]);
  const back = await f.switchPath.execute({
    ...f,
    draft: await f.draft({ edits: [] }),
    action: {
      kind: 'version',
      position: 0,
      nodeId: draft.nodeIds[0],
    },
  });
  expect((await f.reopen()).nodeIds).toEqual(back.nodeIds);
  expect(back.nodeIds).toEqual([draft.nodeIds[0], f.child]);
  expect((await f.nodeRepo.findById(f.root))?.content).toEqual({
    type: 'text',
    text: 'first',
  });
});

test('draft survives a failed commit and clears after success', async () => {
  const f = await bufferFixture();
  const draft = await f.draft();
  await f.bufferDraftStore.put(draft);
  const read = () =>
    f.bufferDraftStore.get(
      f.treeId,
      f.pathId,
      draft.expectedSequence,
      draft.expectedRevision
    );
  jest
    .spyOn(f.db.adapter, 'batch')
    .mockRejectedValueOnce(new Error('storage failure'));
  await expect(f.commit.execute({ ...f, draft })).rejects.toThrow(
    'storage failure'
  );
  expect((await read())?.draft).toEqual(draft);
  await f.commit.execute({ ...f, draft });
  expect(await read()).toBeNull();
});

test('retry after draft cleanup failure recognizes the committed operation', async () => {
  const f = await bufferFixture();
  const draft = await f.draft();
  await f.bufferDraftStore.put(draft);
  jest
    .spyOn(f.bufferDraftStore, 'remove')
    .mockRejectedValueOnce(new Error('cleanup failure'));
  await expect(f.commit.execute({ ...f, draft })).rejects.toThrow(
    'cleanup failure'
  );
  const before = await f.counts();
  await f.commit.execute({ ...f, draft });
  expect(await f.counts()).toEqual(before);
  expect(await f.bufferDraftStore.get(f.treeId, f.pathId, [], 0)).toBeNull();
});

test('branch switch commits the old tail before selecting the sibling', async () => {
  const f = await bufferFixture();
  const child = (await f.nodeRepo.findById(f.child))!;
  const draft = await f.draft({ edits: [], workingTail: ' old branch tail' });
  const id = createULID();
  const sibling = await f.nodeRepo.create({
    ...child,
    id,
    localId: createLocalId(id, await f.nodeRepo.getAllLocalIds(f.treeId)),
    content: { type: 'text', text: 'sibling' },
  });
  await f.edgeRepo.create({
    loomTreeId: f.treeId,
    sources: [{ nodeId: f.root, role: 'primary' }],
    targetNodeId: sibling.id,
    edgeType: 'continuation',
  });
  const result = await f.switchPath.execute({
    ...f,
    draft,
    action: { kind: 'branch', position: 1, nodeId: sibling.id },
  });
  expect(result.nodeIds).toEqual([f.root, sibling.id]);
  expect((await f.reopen()).nodeIds).toEqual(result.nodeIds);
  const tail = await f.nodeRepo.findById(draft.nodeIds[0]);
  expect(tail?.metadata.buffer?.creationParentId).toBe(f.child);
  expect(tail?.content).toEqual({ type: 'text', text: draft.workingTail });
});

test('a recovered switch draft replays the switch after a lost acknowledgement', async () => {
  const f = await bufferFixture();
  const action = { kind: 'version', position: 0, nodeId: f.root } as const;
  const draft = { ...(await f.draft()), action };
  const switched = await f.switchPath.execute({ ...f, draft, action });
  // The acknowledgement is lost: recovery commits the stored draft again.
  const replayed = await f.commit.execute({ ...f, draft });
  expect(replayed.nodeIds).toEqual(switched.nodeIds);
  expect(replayed.nodeIds).toEqual([f.root, f.child]);
  expect(await f.sequence()).toEqual([f.root, f.child]);
});
