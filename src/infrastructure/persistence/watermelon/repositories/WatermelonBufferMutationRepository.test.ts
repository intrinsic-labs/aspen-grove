import { WatermelonPathStateRepository } from './WatermelonPathStateRepository';
import { bufferFixture } from './buffer-mutation-fixture';

test('failed batch has zero partial rows', async () => {
  const f = await bufferFixture();
  const plan = await f.plan(await f.draft({ workingTail: 'tail' }));
  const before = await f.counts();
  jest
    .spyOn(f.db.adapter, 'batch')
    .mockRejectedValueOnce(new Error('injected after preparation'));
  await expect(f.bufferMutationRepo.apply(plan)).rejects.toThrow(
    'after preparation'
  );
  expect(await f.counts()).toEqual(before);
  expect(await f.sequence()).toEqual(plan.expectedSequence);
  expect((await f.pathRepo.findById(f.pathId))?.updatedAt.getTime()).toBe(
    plan.expectedRevision
  );
  expect(await f.bufferMutationRepo.apply(plan)).toBe('applied');
});

test('retry after lost acknowledgement is idempotent', async () => {
  const f = await bufferFixture();
  const plan = await f.plan(await f.draft());
  expect(await f.bufferMutationRepo.apply(plan)).toBe('applied');
  const before = await f.counts();
  expect(await f.bufferMutationRepo.apply(plan)).toBe('already-applied');
  expect(await f.counts()).toEqual(before);
  expect((await f.edgeRepo.findById(f.edge.id))?.sources).toEqual(
    expect.arrayContaining([
      ...f.edge.sources,
      { nodeId: plan.nodeInserts[0].id, role: 'primary' },
    ])
  );
});

test('multiple paths keep their own versions', async () => {
  const f = await bufferFixture();
  const other = await f.makePath();
  const plan = await f.plan(await f.draft());
  await f.bufferMutationRepo.apply(plan);
  expect(await f.sequence()).toEqual(plan.sequence);
  expect(await f.sequence(other)).toEqual(plan.expectedSequence);
  expect(await f.pathRepo.getSelection(f.pathId, f.child)).toMatchObject({
    selectedEdgeId: f.edge.id,
    selectedSourceNodeId: plan.nodeInserts[0].id,
  });
  const states = new WatermelonPathStateRepository(f.db);
  expect(
    (await states.findByPathId(f.pathId, plan.ownerAgentId, 'buffer'))
      ?.activeNodeId
  ).toBe(plan.cursor);
  expect(
    await states.findByPathId(other, plan.ownerAgentId, 'buffer')
  ).toBeNull();
  expect(
    (await f.treeRepo.findById(f.treeId))?.lastMessageAt?.getTime()
  ).toBeGreaterThanOrEqual(plan.createdAt.getTime());
  expect(await f.pathRepo.getSelections(other)).toEqual([]);
});

test('metadata flag update preserves the buffer namespace', async () => {
  const f = await bufferFixture();
  const plan = await f.plan(
    await f.draft({ edits: [{ nodeId: f.child, text: 'second edit' }] })
  );
  await f.bufferMutationRepo.apply(plan);
  const node = plan.nodeInserts[0];
  await f.nodeRepo.updateMetadata(node.id, {
    bookmarked: true,
    bookmarkLabel: 'keep',
  });
  expect((await f.nodeRepo.findById(node.id))?.metadata).toMatchObject({
    bookmarked: true,
    bookmarkLabel: 'keep',
    buffer: { creationParentId: f.root },
  });
});

test('writer rejects a stale revision when a switch returns to the same sequence', async () => {
  const f = await bufferFixture();
  const stale = await f.plan(await f.draft());
  const draft = await f.draft();
  await f.switchPath.execute({
    ...f,
    draft,
    action: { kind: 'version', position: 0, nodeId: f.root },
  });
  expect(await f.sequence()).toEqual(stale.expectedSequence);
  expect(await f.bufferMutationRepo.apply(stale)).toBe('stale');
});
