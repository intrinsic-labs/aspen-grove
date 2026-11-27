import { reserveBufferDraft } from '@application/services/buffer/reserve-buffer-draft';
import { verifyModelNodeProvenance } from '@application/services/provenance';
import { createULID } from '@domain/value-objects';
import { bufferGenerationFixture } from './GenerateBufferContinuationsUseCase.test-fixture';

const nextTurn = () => new Promise((resolve) => setTimeout(resolve, 0));
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('reopen leaves a live draw pending so its settling slot lands', async () => {
  const gate = deferred();
  const f = await bufferGenerationFixture([
    { text: 'settled after reopen', wait: gate.promise },
  ]);
  const running = f.generate.execute({
    treeId: f.treeId,
    pathId: f.pathId,
    ownerAgentId: f.ownerAgentId,
    draft: await f.draft('source'),
    count: 1,
    maxTokens: 10,
  });
  await nextTurn();
  expect(f.provider.started).toBe(1);
  const pending = await f.bufferMutationRepo.findPendingGeneration(
    f.treeId,
    f.pathId
  );
  expect(pending).not.toBeNull();
  expect(f.activeBufferDraws.isActive(pending!.drawId)).toBe(true);

  const openedWhileStreaming = await f.open.execute({ treeId: f.treeId });
  expect(openedWhileStreaming.passages.at(-1)?.text).toBe('source');
  expect(
    await f.bufferMutationRepo.findPendingGeneration(f.treeId, f.pathId)
  ).toEqual(pending);

  gate.resolve();
  const result = await running;
  const slot = result.slots[0];
  if (slot.type !== 'done') throw new Error('Expected a saved slot');
  await expect(
    verifyModelNodeProvenance({
      nodeId: slot.nodeId,
      nodeRepository: f.nodeRepo,
      edgeRepository: f.edgeRepo,
      rawApiResponseRepository: f.rawApiResponseRepo,
    })
  ).resolves.toMatchObject({ isValid: true });
  expect((await f.open.execute({ treeId: f.treeId })).sequence.at(-1)).toBe(
    slot.nodeId
  );
  expect(f.activeBufferDraws.isActive(pending!.drawId)).toBe(false);
});

test('reopen repairs saved activation without re-running inference', async () => {
  const f = await bufferGenerationFixture([{ text: 'saved once' }]);
  const complete = jest
    .spyOn(f.bufferMutationRepo, 'completeGeneration')
    .mockRejectedValueOnce(new Error('lost activation acknowledgement'));
  await expect(
    f.generate.execute({
      treeId: f.treeId,
      pathId: f.pathId,
      ownerAgentId: f.ownerAgentId,
      draft: await f.draft('source'),
      count: 1,
      maxTokens: 10,
    })
  ).rejects.toThrow('lost activation acknowledgement');
  expect(f.provider.requests).toHaveLength(1);
  expect(
    await f.bufferMutationRepo.findPendingGeneration(f.treeId, f.pathId)
  ).not.toBeNull();
  complete.mockRestore();

  const reopened = await f.open.execute({ treeId: f.treeId });
  expect(reopened.passages.at(-1)?.text).toBe('saved once');
  expect(f.provider.requests).toHaveLength(1);
  expect(
    await f.bufferMutationRepo.findPendingGeneration(f.treeId, f.pathId)
  ).toBeNull();
});

test('editing a signed parent twice leaves the old child verifiable', async () => {
  const f = await bufferGenerationFixture([{ text: 'signed child' }]);
  const result = await f.generate.execute({
    treeId: f.treeId,
    pathId: f.pathId,
    ownerAgentId: f.ownerAgentId,
    draft: await f.draft('original parent'),
    count: 1,
    maxTokens: 10,
  });
  const child = result.slots[0];
  if (child.type !== 'done') throw new Error('Expected saved child');

  for (const text of ['first edit', 'second edit']) {
    const opened = await f.open.execute({ treeId: f.treeId });
    const parentId = opened.sequence.at(-2)!;
    const draft = await reserveBufferDraft(
      opened.graph,
      opened.path,
      {
        treeId: f.treeId,
        pathId: f.pathId,
        ownerAgentId: f.ownerAgentId,
        expectedSequence: opened.sequence,
        expectedRevision: opened.revision,
        edits: [{ nodeId: parentId, text }],
        workingTail: '',
      },
      {
        newId: createULID,
        now: Date.now,
        selections: opened.selections,
      }
    );
    await f.commit.execute({ treeId: f.treeId, pathId: f.pathId, draft });
  }

  await expect(
    verifyModelNodeProvenance({
      nodeId: child.nodeId,
      nodeRepository: f.nodeRepo,
      edgeRepository: f.edgeRepo,
      rawApiResponseRepository: f.rawApiResponseRepo,
    })
  ).resolves.toMatchObject({ isValid: true, parentNodeCount: 1 });
  const edges = await f.edgeRepo.findContinuationsByTargetNodeId(child.nodeId);
  expect(edges[0].sources).toHaveLength(3);
});
