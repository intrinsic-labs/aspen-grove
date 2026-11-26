import { createULID } from '@domain/value-objects';
// This integration suite drives the application through its real persistence ports.
// eslint-disable-next-line boundaries/element-types
import { bufferFixture } from '@infrastructure/persistence/watermelon/repositories/buffer-mutation-fixture';
import { indexBufferGraph } from './buffer-graph';
import type { BufferDraftText } from './draft-from-document';
import { reserveBufferDraft } from './reserve-buffer-draft';

const setup = async () => {
  const f = await bufferFixture();
  const graph = indexBufferGraph(
    await f.nodeRepo.findByLoomTreeId(f.treeId, true),
    await f.edgeRepo.findByLoomTreeId(f.treeId)
  );
  const path = await f.reopen();
  const revision = (await f.pathRepo.findById(f.pathId))!.updatedAt.getTime();
  const owner = (await f.draft()).ownerAgentId;
  const text = (overrides: Partial<BufferDraftText> = {}): BufferDraftText => ({
    treeId: f.treeId,
    pathId: f.pathId,
    ownerAgentId: owner,
    expectedSequence: path.nodeIds,
    expectedRevision: revision,
    edits: [{ nodeId: f.root, text: 'edited' }],
    workingTail: ' tail',
    ...overrides,
  });
  return { f, graph, path, text, owner };
};

const options = (extra = {}) => ({
  newId: createULID,
  now: () => Date.now(),
  selections: [],
  ...extra,
});

test('reserved ids replay the same plan', async () => {
  const { f, graph, path, text, owner } = await setup();
  const typed = text();
  const first = await reserveBufferDraft(graph, path, typed, options());
  // One new node for the edit, one for the tail; the edit's incoming edges
  // and the tail's edge are reserved too.
  expect(first.nodeIds).toHaveLength(2);
  expect(first.edgeIds.length).toBeGreaterThan(0);
  expect(first.createdAtMs).toBeDefined();
  const again = await reserveBufferDraft(
    graph,
    path,
    typed,
    options({ previous: first })
  );
  expect(again).toBe(first);

  // The reserved draft commits through the real use case, which throws if any
  // reservation is short; a retry after the commit changes nothing.
  await f.commit.execute({ ...f, draft: first });
  const before = await f.counts();
  await f.commit.execute({ ...f, draft: first });
  expect(await f.counts()).toEqual(before);
  expect((await f.reopen()).nodeIds).toHaveLength(3);
});

test('changed text before any commit keeps the operation and its ids', async () => {
  const { f, graph, path, text, owner } = await setup();
  const first = await reserveBufferDraft(
    graph,
    path,
    text({ workingTail: '' }),
    options()
  );
  const more = await reserveBufferDraft(
    graph,
    path,
    text({ workingTail: 'more' }),
    options({ previous: first })
  );
  expect(more.operationId).toBe(first.operationId);
  expect(more.createdAtMs).toBe(first.createdAtMs);
  expect(more.nodeIds.slice(0, first.nodeIds.length)).toEqual(first.nodeIds);
  expect(more.nodeIds.length).toBeGreaterThan(first.nodeIds.length);
});

test('changed text after a committed operation takes a new operation id', async () => {
  const { f, graph, path, text, owner } = await setup();
  const first = await reserveBufferDraft(graph, path, text(), options());
  await f.commit.execute({ ...f, draft: first });
  // The editor still holds the pre-commit graph and does not know the outcome:
  // the path's first row names the operation that committed.
  const head = (await f.pathRepo.getNodeSequence(f.pathId))[0].id;
  const next = await reserveBufferDraft(
    graph,
    path,
    text({ workingTail: ' different' }),
    options({ previous: first, isCommitted: (op: string) => op === head })
  );
  expect(next.operationId).not.toBe(first.operationId);
  expect(next.nodeIds.some((id) => first.nodeIds.includes(id))).toBe(false);
  // The same holds when the graph itself already shows the committed nodes.
  const fresh = indexBufferGraph(
    await f.nodeRepo.findByLoomTreeId(f.treeId, true),
    await f.edgeRepo.findByLoomTreeId(f.treeId)
  );
  const reopened = await f.reopen();
  const viaGraph = await reserveBufferDraft(
    fresh,
    reopened,
    text({
      expectedSequence: reopened.nodeIds,
      expectedRevision: (await f.pathRepo.findById(
        f.pathId
      ))!.updatedAt.getTime(),
      edits: [],
    }),
    options({
      previous: {
        ...first,
        expectedSequence: reopened.nodeIds,
        expectedRevision: (await f.pathRepo.findById(
          f.pathId
        ))!.updatedAt.getTime(),
      },
    })
  );
  expect(viaGraph.operationId).not.toBe(first.operationId);
});
