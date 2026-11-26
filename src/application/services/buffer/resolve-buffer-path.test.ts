import { describe, expect, it } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import { assembleBufferContext } from './assemble-buffer-context';
import { indexBufferGraph } from './buffer-graph';
import {
  id,
  link,
  spine,
  spineId,
  textNode,
  withSource,
} from './buffer-graph-fixtures';
import { resolveBufferPath } from './resolve-buffer-path';

const ids = (...names: string[]): ULID[] => names.map(id);
const range = (from: number, to: number): ULID[] =>
  Array.from({ length: to - from + 1 }, (_, i) => spineId(from + i));

const open = { kind: 'open' } as const;

/** n00..n18 with n05 edited to n05b, as the commit step will write it. */
const editedSpine = () => {
  const { nodes, edges } = spine(19);
  return {
    nodes: [...nodes, textNode('n05b', '<5b>', { at: 100, editedFrom: 'n05' })],
    edges: [
      ...withSource(edges, 'e5', 'n05b'),
      link('e4b', ['n04'], 'n05b', 100),
    ],
  };
};

describe('versions', () => {
  it('edit at 5 preserves exact 6–18 IDs', () => {
    const { nodes, edges } = editedSpine();
    const graph = indexBufferGraph(nodes, edges);
    const result = resolveBufferPath(graph, range(0, 18), [], {
      kind: 'version',
      position: 5,
      nodeId: id('n05b'),
    });
    expect(result.nodeIds).toEqual([
      ...range(0, 4),
      id('n05b'),
      ...range(6, 18),
    ]);
    expect(result.nodeIds.slice(6)).toEqual(range(6, 18));
    expect(result.leafId).toBe(spineId(18));
    expect(result.issues).toEqual([]);
    // Entering 5b has one parent; the step out of it has several, so only that is remembered.
    expect(result.selections).toEqual([
      {
        targetNodeId: spineId(6),
        selectedEdgeId: id('e5'),
        selectedSourceNodeId: id('n05b'),
      },
    ]);
  });

  it('switch original and twice-edited leaf', () => {
    const { nodes, edges } = spine(3);
    const graph = indexBufferGraph(
      [
        ...nodes,
        textNode('l1', 'one', { at: 10, editedFrom: 'n02' }),
        textNode('l2', 'two', { at: 20, editedFrom: 'l1' }),
      ],
      [
        ...edges,
        link('e-l1', ['n01'], 'l1', 10),
        link('e-l2', ['n01'], 'l2', 20),
      ]
    );
    expect(graph.familyOf.get(id('l2'))).toBe(id('n02'));
    const seq = range(0, 2);
    const toLatest = resolveBufferPath(graph, seq, [], {
      kind: 'version',
      position: 2,
      nodeId: id('l2'),
    });
    expect(toLatest.leafId).toBe(id('l2'));
    const back = resolveBufferPath(graph, toLatest.nodeIds, [], {
      kind: 'version',
      position: 2,
      nodeId: spineId(2),
    });
    expect(back.nodeIds).toEqual(seq);
    expect(back.leafId).toBe(spineId(2));
    // The stored leaf wins over the newer edits on open.
    expect(resolveBufferPath(graph, seq, [], open).leafId).toBe(spineId(2));
  });

  it('generate after selecting an older version sees that exact text', () => {
    const graph = indexBufferGraph(
      [
        textNode('r', ''),
        textNode('v0', 'The cat ', { at: 1 }),
        textNode('v1', 'The dog ', { at: 2, editedFrom: 'v0' }),
        textNode('t', 'sat\n\non the mat'),
      ],
      [
        link('e0', ['r'], 'v0', 1),
        link('e1', ['r'], 'v1', 2),
        link('e2', ['v0', 'v1'], 't', 3),
      ]
    );
    const latest = resolveBufferPath(graph, [], [], open);
    expect(latest.nodeIds).toEqual(ids('r', 'v1', 't'));
    const older = resolveBufferPath(graph, latest.nodeIds, [], {
      kind: 'version',
      position: 1,
      nodeId: id('v0'),
    });
    const resolvedNodes = older.nodeIds.map((n) => graph.nodesById.get(n)!);
    expect(
      assembleBufferContext({
        resolvedNodes,
        tail: ' ',
        maxContextTokens: 5000,
        maxTokens: 50,
      }).prompt
    ).toBe('The cat sat\n\non the mat ');
  });

  it('rejects a switch that is not a version of that position', () => {
    const { nodes, edges } = editedSpine();
    const graph = indexBufferGraph(nodes, edges);
    const result = resolveBufferPath(graph, range(0, 18), [], {
      kind: 'version',
      position: 4,
      nodeId: id('n05b'),
    });
    expect(result.nodeIds).toEqual(range(0, 18));
    expect(result.issues).toEqual([
      { kind: 'action-rejected', reason: 'wrong-family' },
    ]);
  });

  it('switching the last node to a version with continuations follows them to a leaf', () => {
    const graph = indexBufferGraph(
      [
        textNode('r', 'r', { at: 0 }),
        textNode('a', 'a', { at: 1 }),
        textNode('a2', 'a2', { at: 2, editedFrom: 'a' }),
        textNode('t', 't', { at: 3 }),
      ],
      [
        link('ea', ['r'], 'a', 1),
        link('ea2', ['r'], 'a2', 2),
        link('et', ['a2'], 't', 3),
      ]
    );
    const result = resolveBufferPath(graph, ids('r', 'a'), [], {
      kind: 'version',
      position: 1,
      nodeId: id('a2'),
    });
    expect(result.nodeIds).toEqual(ids('r', 'a2', 't'));
    expect(result.leafId).toBe(id('t'));
  });

  it('replaces the suffix when the new version does not reach it', () => {
    const { nodes, edges } = spine(4);
    const graph = indexBufferGraph(
      [
        ...nodes,
        textNode('n01b', 'x', { at: 9, editedFrom: 'n01' }),
        textNode('z', 'z', { at: 9 }),
      ],
      [
        ...edges,
        link('e-in', ['n00'], 'n01b', 9),
        link('e-z', ['n01b'], 'z', 9),
      ]
    );
    const result = resolveBufferPath(graph, range(0, 3), [], {
      kind: 'version',
      position: 1,
      nodeId: id('n01b'),
    });
    expect(result.nodeIds).toEqual(ids('n00', 'n01b', 'z'));
    expect(result.issues).toEqual([
      { kind: 'suffix-replaced', fromPosition: 2 },
    ]);
  });
});

describe('branches', () => {
  /** n00..n04, then A: a05..a07 or B: b05..b08. B is newer. */
  const forked = () => {
    const { nodes, edges } = spine(5);
    return indexBufferGraph(
      [
        ...nodes,
        ...['a05', 'a06', 'a07'].map((n, i) => textNode(n, n, { at: 10 + i })),
        ...['b05', 'b06', 'b07', 'b08'].map((n, i) =>
          textNode(n, n, { at: 20 + i })
        ),
      ],
      [
        ...edges,
        link('ea5', ['n04'], 'a05', 10),
        link('ea6', ['a05'], 'a06', 11),
        link('ea7', ['a06'], 'a07', 12),
        link('eb5', ['n04'], 'b05', 20),
        link('eb6', ['b05'], 'b06', 21),
        link('eb7', ['b06'], 'b07', 22),
        link('eb8', ['b07'], 'b08', 23),
      ]
    );
  };

  it("branch at 5 selects only B's suffix", () => {
    const graph = forked();
    const onA = resolveBufferPath(
      graph,
      [...range(0, 4), id('a05'), id('a06')],
      [],
      open
    );
    expect(onA.nodeIds).toEqual([...range(0, 4), ...ids('a05', 'a06', 'a07')]);
    const result = resolveBufferPath(graph, onA.nodeIds, [], {
      kind: 'branch',
      position: 5,
      nodeId: id('b05'),
    });
    expect(result.nodeIds).toEqual([
      ...range(0, 4),
      ...ids('b05', 'b06', 'b07', 'b08'),
    ]);
    expect(result.nodeIds.some((n) => n.startsWith('a'))).toBe(false);
    expect(result.leafId).toBe(id('b08'));
  });

  it('rejects a branch into the same family or an unreachable node', () => {
    const graph = forked();
    const seq = [...range(0, 4), ...ids('a05', 'a06', 'a07')];
    const same = resolveBufferPath(graph, seq, [], {
      kind: 'branch',
      position: 5,
      nodeId: id('a05'),
    });
    expect(same.issues).toContainEqual({
      kind: 'action-rejected',
      reason: 'same-family',
    });
    const far = resolveBufferPath(graph, seq, [], {
      kind: 'branch',
      position: 5,
      nodeId: id('b06'),
    });
    expect(far.issues).toContainEqual({
      kind: 'action-rejected',
      reason: 'not-linked',
    });
    expect(far.nodeIds).toEqual(seq);
  });

  it('inactive sibling receives upstream edit', () => {
    const graph0 = forked();
    const edited = indexBufferGraph(
      [
        ...graph0.nodesById.values(),
        textNode('n04b', '<4b>', { at: 50, editedFrom: 'n04' }),
      ],
      [
        ...withSource(
          withSource([...graph0.edgesById.values()], 'ea5', 'n04b'),
          'eb5',
          'n04b'
        ),
        link('e3b', ['n03'], 'n04b', 50),
      ]
    );
    // The inactive branch B already lists the edit as a primary source.
    const intoB = edited.incoming.get(id('b05'))![0];
    expect(intoB.sources).toContainEqual({
      nodeId: id('n04b'),
      role: 'primary',
    });

    const onA = resolveBufferPath(
      edited,
      [...range(0, 4), id('a05')],
      [],
      open
    );
    const switched = resolveBufferPath(edited, onA.nodeIds, [], {
      kind: 'version',
      position: 4,
      nodeId: id('n04b'),
    });
    expect(switched.nodeIds.slice(0, 5)).toEqual([...range(0, 3), id('n04b')]);
    const toB = resolveBufferPath(edited, switched.nodeIds, [], {
      kind: 'branch',
      position: 5,
      nodeId: id('b05'),
    });
    expect(toB.nodeIds).toEqual([
      ...range(0, 3),
      id('n04b'),
      ...ids('b05', 'b06', 'b07', 'b08'),
    ]);
    expect(toB.issues).toEqual([]);
  });
});
