import { verifyModelNodeProvenance } from '@application/services/provenance';
import * as hashService from '@application/services/content-hash-service';
import type { ContentHash } from '@domain/value-objects';
import { createULID } from '@domain/value-objects';
import {
  bufferGenerationFixture,
  type StreamScript,
} from './GenerateBufferContinuationsUseCase.test-fixture';

const nextTurn = () => new Promise((resolve) => setTimeout(resolve, 0));
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('four concurrent literal streams settle independently with exact evidence', async () => {
  const scripts: StreamScript[] = [
    { text: ' first ' },
    { text: 'second' },
    { text: '\npartial\n', interruption: 'timeout' },
    { fail: 'before' },
  ];
  const f = await bufferGenerationFixture(scripts);
  const begin = jest.spyOn(f.bufferMutationRepo, 'beginGeneration');
  const draft = await f.draft('Exact prompt ');
  const result = await f.generate.execute({
    treeId: f.treeId,
    pathId: f.pathId,
    ownerAgentId: f.ownerAgentId,
    draft,
    count: 4,
    maxTokens: 25,
  });

  expect(f.provider.maxOpen).toBe(4);
  expect(new Set(f.provider.evidenceIds).size).toBe(4);
  expect(
    f.provider.requests.map((request) =>
      'prompt' in request ? request.prompt : 'not text'
    )
  ).toEqual(Array(4).fill('Exact prompt '));
  expect(result.slots.map((slot) => slot.type)).toEqual([
    'done',
    'done',
    'interrupted',
    'error',
  ]);
  const saved = result.slots.flatMap((slot) =>
    slot.type === 'done' || slot.type === 'interrupted' ? [slot] : []
  );
  expect(new Set(saved.map((slot) => slot.rawApiResponseId)).size).toBe(3);
  expect(new Set(saved.map((slot) => slot.nodeId)).size).toBe(3);
  expect(
    await Promise.all(
      saved.map((slot) => f.nodeRepo.findById(slot.nodeId, true))
    )
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ content: { type: 'text', text: ' first ' } }),
      expect.objectContaining({
        content: { type: 'text', text: '\npartial\n' },
      }),
    ])
  );
  for (const slot of saved) {
    await expect(
      f.rawApiResponseRepo.findByNodeId(slot.nodeId)
    ).resolves.toMatchObject({ compressionType: 'gzip' });
    await expect(
      verifyModelNodeProvenance({
        nodeId: slot.nodeId,
        nodeRepository: f.nodeRepo,
        edgeRepository: f.edgeRepo,
        rawApiResponseRepository: f.rawApiResponseRepo,
      })
    ).resolves.toMatchObject({ isValid: true, parentNodeCount: 1 });
  }
  expect(f.activeBufferDraws.isActive(begin.mock.calls[0][0].drawId)).toBe(
    false
  );
});

test('failed persisted verification removes only that slot', async () => {
  const sha = jest
    .spyOn(hashService, 'computeSha256Hash')
    .mockImplementation(async (payload) => payload as ContentHash);
  const modelHash = jest
    .spyOn(hashService, 'computeModelContentHash')
    .mockImplementation(
      async (_content, parents, _createdAt, _author, raw) =>
        `${parents.join(',')}|${raw}` as ContentHash
    );
  const f = await bufferGenerationFixture([
    { text: 'will be rolled back' },
    { text: 'survives' },
  ]);
  const read = f.rawApiResponseRepo.findByNodeId.bind(f.rawApiResponseRepo);
  let first = true;
  jest
    .spyOn(f.rawApiResponseRepo, 'findByNodeId')
    .mockImplementation(async (id) => {
      const raw = await read(id);
      if (first && raw) {
        first = false;
        return { ...raw, responseBody: `${raw.responseBody}tampered` };
      }
      return raw;
    });
  const result = await f.generate.execute({
    treeId: f.treeId,
    pathId: f.pathId,
    ownerAgentId: f.ownerAgentId,
    draft: await f.draft('prompt'),
    count: 2,
    maxTokens: 10,
  });
  expect(result.slots.map((slot) => slot.type)).toEqual(['error', 'done']);
  const generated = (await f.nodeRepo.findByLoomTreeId(f.treeId, true)).filter(
    (node) => node.metadata.buffer?.drawId
  );
  expect(generated).toHaveLength(1);
  expect(generated[0].content).toEqual({ type: 'text', text: 'survives' });
  sha.mockRestore();
  modelHash.mockRestore();
});

test('all slots fail and keep the committed human tail', async () => {
  const f = await bufferGenerationFixture([
    { fail: 'before' },
    { fail: 'before' },
  ]);
  const begin = jest.spyOn(f.bufferMutationRepo, 'beginGeneration');
  const result = await f.generate.execute({
    treeId: f.treeId,
    pathId: f.pathId,
    ownerAgentId: f.ownerAgentId,
    draft: await f.draft('kept tail'),
    count: 2,
    maxTokens: 12,
  });
  expect(result.slots.map((slot) => slot.type)).toEqual(['error', 'error']);
  const sequence = await f.sequence();
  expect(sequence).toHaveLength(2);
  expect((await f.nodeRepo.findById(sequence[1], true))?.content).toEqual({
    type: 'text',
    text: 'kept tail',
  });
  expect(f.activeBufferDraws.isActive(begin.mock.calls[0][0].drawId)).toBe(
    false
  );
});

test('a retryable failure after a delta is never retried', async () => {
  const f = await bufferGenerationFixture([{ text: 'partial', fail: 'after' }]);
  const result = await f.generate.execute({
    treeId: f.treeId,
    pathId: f.pathId,
    ownerAgentId: f.ownerAgentId,
    draft: await f.draft('prompt'),
    count: 1,
    maxTokens: 10,
  });
  expect(result.slots[0].type).toBe('error');
  expect(f.provider.requests).toHaveLength(1);
});

test('double tap shares one operation and starts one draw', async () => {
  const gate = deferred();
  const f = await bufferGenerationFixture([
    { text: 'result', wait: gate.promise },
  ]);
  const input = {
    treeId: f.treeId,
    pathId: f.pathId,
    ownerAgentId: f.ownerAgentId,
    draft: await f.draft('prompt'),
    count: 1,
    maxTokens: 10,
  };
  const first = f.generate.execute(input);
  const second = f.generate.execute(input);
  await nextTurn();
  expect(f.provider.started).toBe(1);
  gate.resolve();
  expect(await second).toEqual(await first);
  const nodes = await f.nodeRepo.findByLoomTreeId(f.treeId, true);
  expect(nodes.filter((node) => node.metadata.buffer?.drawId)).toHaveLength(1);
});

test('stream deltas write no nodes before settlement', async () => {
  const gate = deferred();
  const f = await bufferGenerationFixture([
    { text: 'streaming', wait: gate.promise },
  ]);
  const running = f.generate.execute({
    treeId: f.treeId,
    pathId: f.pathId,
    ownerAgentId: f.ownerAgentId,
    draft: await f.draft('prompt'),
    count: 1,
    maxTokens: 10,
  });
  await nextTurn();
  const before = await f.nodeRepo.findByLoomTreeId(f.treeId, true);
  expect(before.filter((node) => node.metadata.buffer?.drawId)).toHaveLength(0);
  gate.resolve();
  await running;
  const after = await f.nodeRepo.findByLoomTreeId(f.treeId, true);
  expect(after.filter((node) => node.metadata.buffer?.drawId)).toHaveLength(1);
});

test('cancellation after a delta saves the literal partial', async () => {
  const gate = deferred();
  const abort = new AbortController();
  const f = await bufferGenerationFixture([
    { text: ' partial ', wait: gate.promise },
  ]);
  const begin = jest.spyOn(f.bufferMutationRepo, 'beginGeneration');
  const running = f.generate.execute({
    treeId: f.treeId,
    pathId: f.pathId,
    ownerAgentId: f.ownerAgentId,
    draft: await f.draft('prompt'),
    count: 1,
    maxTokens: 10,
    signal: abort.signal,
  });
  await nextTurn();
  abort.abort();
  gate.resolve();
  const result = await running;
  expect(result.slots[0]).toMatchObject({ type: 'cancelled', slot: 0 });
  const saved =
    result.slots[0].type === 'cancelled' ? result.slots[0].saved : undefined;
  expect(saved).toBeDefined();
  expect((await f.nodeRepo.findById(saved!.nodeId, true))?.content).toEqual({
    type: 'text',
    text: ' partial ',
  });
  expect(f.activeBufferDraws.isActive(begin.mock.calls[0][0].drawId)).toBe(
    false
  );
});

test('slot order survives out-of-order completion', async () => {
  const gates = [deferred(), deferred(), deferred()];
  const f = await bufferGenerationFixture(
    gates.map((gate, slot) => ({ text: `slot-${slot}`, wait: gate.promise }))
  );
  const running = f.generate.execute({
    treeId: f.treeId,
    pathId: f.pathId,
    ownerAgentId: f.ownerAgentId,
    draft: await f.draft('prompt'),
    count: 3,
    maxTokens: 10,
  });
  await nextTurn();
  gates[2].resolve();
  gates[1].resolve();
  gates[0].resolve();
  const result = await running;
  expect(result.slots.map((slot) => slot.slot)).toEqual([0, 1, 2]);
  const nodes = await f.nodeRepo.findByLoomTreeId(f.treeId, true);
  expect(
    nodes
      .filter((node) => node.metadata.buffer?.drawId)
      .map((node) => node.metadata.buffer?.slot)
      .sort()
  ).toEqual([0, 1, 2]);
});

test("stale navigation cannot steal the path's focus", async () => {
  const gate = deferred();
  const f = await bufferGenerationFixture([
    { text: 'late', wait: gate.promise },
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
  await f.pathRepo.replaceSuffix(f.pathId, 0, [f.root]);
  gate.resolve();
  await running;
  expect(await f.sequence()).toEqual([f.root]);
  expect(
    (await f.nodeRepo.findByLoomTreeId(f.treeId, true)).filter(
      (node) => node.metadata.buffer?.drawId
    )
  ).toHaveLength(1);
});

test('setup failure starts no slot', async () => {
  const f = await bufferGenerationFixture([{ text: 'unused' }]);
  await expect(
    f.generate.execute({
      treeId: f.treeId,
      pathId: f.pathId,
      ownerAgentId: createULID(),
      draft: await f.draft('prompt'),
      count: 1,
      maxTokens: 10,
    })
  ).rejects.toThrow();
  expect(f.provider.started).toBe(0);
});
