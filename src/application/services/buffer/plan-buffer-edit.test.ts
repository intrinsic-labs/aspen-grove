import type { BufferMutation } from '@application/repositories/core/IBufferMutationRepository';
import type { PathSelection } from '@domain/entities';
import type { ContentHash, ULID } from '@domain/value-objects';
import { indexBufferGraph, type BufferGraph } from './buffer-graph';
import { id, link, spine, spineId, textNode } from './buffer-graph-fixtures';
import {
  planBufferEdit,
  type BufferDraft,
  type BufferEditPorts,
} from './plan-buffer-edit';
import { resolveBufferPath } from './resolve-buffer-path';

const base = spine(4);
const graph = indexBufferGraph(base.nodes, base.edges);
const sequence = base.nodes.map((node) => node.id);
const edit = (position: number, text: string) => ({
  nodeId: spineId(position),
  text,
});
const reserved = (kind: string) =>
  Array.from({ length: 12 }, (_, i) => id(kind + i));
const draft: BufferDraft = {
  pathId: id('path'),
  treeId: id('tree'),
  ownerAgentId: id('human'),
  operationId: id('op'),
  expectedRevision: 7,
  expectedSequence: sequence,
  createdAtMs: 100,
  nodeIds: reserved('version'),
  edgeIds: reserved('edge'),
  edits: [edit(1, 'changed')],
  workingTail: '',
};
const ports: BufferEditPorts = {
  nextId: () => {
    throw new Error('Unexpected id allocation');
  },
  now: () => {
    throw new Error('Unexpected timestamp allocation');
  },
  hashHuman: async (content, parents, time, author) =>
    JSON.stringify([content, parents, time.getTime(), author]) as ContentHash,
};
const open = (
  g: BufferGraph,
  ids: readonly ULID[],
  selections: PathSelection[] = []
) => resolveBufferPath(g, ids, selections, { kind: 'open' });
const plan = (changes: Partial<BufferDraft> = {}, g = graph, ids = sequence) =>
  planBufferEdit(
    g,
    open(g, ids),
    { ...draft, expectedSequence: ids, ...changes },
    ports
  );

function apply(g: BufferGraph, mutation: BufferMutation) {
  const edges = [...g.edgesById.values()].map((edge) => ({
    ...edge,
    sources: [
      ...edge.sources,
      ...mutation.sourceAdditions
        .filter((addition) => addition.edgeId === edge.id)
        .map((addition) => addition.source),
    ],
  }));
  return indexBufferGraph(
    [...g.nodesById.values(), ...mutation.nodeInserts],
    [...edges, ...mutation.edgeInserts]
  );
}
function verify(
  g: BufferGraph,
  mutation: BufferMutation,
  ids: readonly ULID[],
  texts: readonly string[]
) {
  const updated = apply(g, mutation);
  const selections = mutation.selectionUpserts.map((selection, i) => ({
    ...selection,
    id: id('selection' + i),
    updatedAt: mutation.createdAt,
  }));
  const reopened = open(updated, mutation.sequence, selections);
  expect(updated.issues).toEqual([]);
  expect(reopened.issues).toEqual([]);
  expect(reopened.nodeIds).toEqual(ids);
  expect(mutation.cursor).toBe(ids[ids.length - 1]);
  expect(
    reopened.nodeIds.map((key) => updated.nodesById.get(key)?.content)
  ).toEqual(texts.map((text) => ({ type: 'text', text })));
  expect(
    reopened.selections.map((s) => ({ ...s, pathId: draft.pathId }))
  ).toEqual(mutation.selectionUpserts);
  return updated;
}

test('edit versus branch leaves graph cardinalities distinct', async () => {
  const updated = apply(graph, await plan());
  const branched = indexBufferGraph(
    [...base.nodes, textNode('alternate', 'other')],
    [...base.edges, link('branch', ['n00'], 'alternate')]
  );
  expect(updated.nodesById.size).toBe(branched.nodesById.size);
  expect(updated.versionsOf.size).toBe(4);
  expect(branched.versionsOf.size).toBe(5);
  expect(updated.childFamilies.get(spineId(0))).toHaveLength(1);
  expect(branched.childFamilies.get(spineId(0))).toHaveLength(2);
});

test('one new version and zero downstream clones', async () => {
  const mutation = await plan();
  const [version] = mutation.nodeInserts;
  expect(mutation.nodeInserts).toHaveLength(1);
  expect(version).toMatchObject({
    editedFrom: spineId(1),
    authorType: 'human',
    authorAgentId: draft.ownerAgentId,
    metadata: { buffer: { creationParentId: spineId(0) } },
  });
  const updated = verify(
    graph,
    mutation,
    [spineId(0), version.id, spineId(2), spineId(3)],
    ['<0>', 'changed', '<2>', '<3>']
  );
  for (const original of base.nodes)
    expect(updated.nodesById.get(original.id)).toBe(original);
});

test('commit tail before editing across it', async () => {
  const oldLeaf = textNode('otherLeaf', 'old', { editedFrom: 'n03' });
  const g = indexBufferGraph(
    [...base.nodes, oldLeaf],
    [...base.edges, link('alt', ['n02'], 'otherLeaf')]
  );
  const mutation = await plan(
    { workingTail: ' \n', edits: [edit(3, 'new')] },
    g
  );
  const [tail, version] = mutation.nodeInserts;
  expect(tail.metadata.buffer?.creationParentId).toBe(spineId(3));
  expect(tail.contentHash).toBe(
    await ports.hashHuman(
      tail.content,
      [base.nodes[3].contentHash],
      mutation.createdAt,
      draft.ownerAgentId
    )
  );
  expect(mutation.edgeInserts[0].sources.map((s) => s.nodeId)).toEqual([
    spineId(3),
    oldLeaf.id,
    version.id,
  ]);
  verify(
    g,
    mutation,
    [...sequence.slice(0, 3), version.id, tail.id],
    ['<0>', '<1>', '<2>', 'new', ' \n']
  );
});

test('empty version remains reachable', async () => {
  const mutation = await plan({ edits: [edit(2, '')] });
  verify(
    graph,
    mutation,
    [spineId(0), spineId(1), draft.nodeIds[0], spineId(3)],
    ['<0>', '<1>', '', '<3>']
  );
});

test('multiple paths keep their own versions', async () => {
  const mutation = await plan();
  const updated = apply(graph, mutation);
  expect(open(updated, sequence).nodeIds).toEqual(sequence);
  expect(open(updated, mutation.sequence).nodeIds[1]).toBe(draft.nodeIds[0]);
  expect(mutation.pathId).toBe(draft.pathId);
  expect(mutation.selectionUpserts).toEqual([
    {
      pathId: draft.pathId,
      targetNodeId: spineId(2),
      selectedEdgeId: id('e1'),
      selectedSourceNodeId: draft.nodeIds[0],
    },
  ]);
});

test('no-op edit adds no version', async () => {
  const mutation = await plan({ edits: [edit(1, '<1>')] });
  expect(mutation).toMatchObject({
    nodeInserts: [],
    edgeInserts: [],
    sourceAdditions: [],
    sequence,
  });
});

test('adjacent edits connect through the new versions', async () => {
  const mutation = await plan({ edits: [edit(2, 'second'), edit(1, 'first')] });
  const [first, second] = mutation.nodeInserts;
  expect(second.metadata.buffer?.creationParentId).toBe(first.id);
  expect(second.contentHash).toBe(
    await ports.hashHuman(
      second.content,
      [first.contentHash],
      mutation.createdAt,
      draft.ownerAgentId
    )
  );
  const updated = verify(
    graph,
    mutation,
    [spineId(0), first.id, second.id, spineId(3)],
    ['<0>', 'first', 'second', '<3>']
  );
  expect(
    updated.incoming.get(second.id)?.[0].sources.map((s) => s.nodeId)
  ).toEqual([spineId(1), first.id]);
});

test('retry with the same draft produces the same plan', async () => {
  const input = {
    ...draft,
    workingTail: 'x',
    edits: [edit(1, 'a'), edit(2, 'b')],
  };
  const path = open(graph, sequence);
  expect(await planBufferEdit(graph, path, input, ports)).toStrictEqual(
    await planBufferEdit(graph, path, input, ports)
  );
});

test('an off-path child of the family gains the new version as a source', async () => {
  const alt = textNode('prior', 'prior', { editedFrom: 'n01' });
  const child = textNode('aside', 'aside');
  const g = indexBufferGraph(
    [...base.nodes, alt, child],
    [
      ...base.edges,
      link('toPrior', ['n00'], 'prior'),
      link('toAside', ['prior'], 'aside'),
      link('both', ['prior', 'n01'], 'aside'),
    ]
  );
  const mutation = await plan({}, g);
  expect(mutation.sourceAdditions.map((a) => a.edgeId).sort()).toEqual([
    'both',
    'e1',
    'toAside',
  ]);
  for (const addition of mutation.sourceAdditions)
    expect(addition.source).toEqual({
      nodeId: draft.nodeIds[0],
      role: 'primary',
    });
});

test('copies each incoming continuation with its context and instruction sources intact', async () => {
  const extra = link('also', ['n00'], 'n01');
  extra.sources.push(
    { nodeId: spineId(2), role: 'context' },
    { nodeId: spineId(3), role: 'instruction' }
  );
  const g = indexBufferGraph(base.nodes, [
    ...base.edges,
    extra,
    link('note', ['n00'], 'n01', 0, { type: 'annotation' }),
  ]);
  const mutation = await plan({}, g);
  expect(mutation.edgeInserts.map((e) => e.sources)).toEqual([
    base.edges[0].sources,
    extra.sources,
  ]);
});

test('requests only missing reservations and shares one timestamp across the batch', async () => {
  const nextId = jest.fn<
    ReturnType<BufferEditPorts['nextId']>,
    Parameters<BufferEditPorts['nextId']>
  >((op, kind, index) => id(op + kind + index));
  const now = jest.fn(() => new Date(50));
  const input = {
    ...draft,
    createdAtMs: undefined,
    nodeIds: [],
    edgeIds: [],
    workingTail: 'tail',
  };
  const mutation = await planBufferEdit(graph, open(graph, sequence), input, {
    ...ports,
    nextId,
    now,
  });
  expect(now).toHaveBeenCalledTimes(1);
  expect(nextId.mock.calls).toEqual(
    ['node', 'node', 'edge', 'edge'].map((kind, i) => [
      draft.operationId,
      kind,
      i % 2,
    ])
  );
  for (const row of [...mutation.nodeInserts, ...mutation.edgeInserts])
    expect(row.createdAt).toBe(mutation.createdAt);
});
