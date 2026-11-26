import { resolveVersionFamilies } from './version-family';
import { describe, expect, it } from '@jest/globals';
import type { PathSelection } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { indexBufferGraph } from './buffer-graph';
import { id, link, textNode } from './buffer-graph-fixtures';
import { resolveBufferPath } from './resolve-buffer-path';

const ids = (...names: string[]): ULID[] => names.map(id);
const remember = (
  target: string,
  source: string,
  updatedAt = 1,
  name = `sel-${target}-${source}`
): PathSelection => ({
  id: id(name),
  pathId: id('path'),
  targetNodeId: id(target),
  selectedSourceNodeId: id(source),
  updatedAt: new Date(updatedAt),
});

const open = { kind: 'open' } as const;

describe('defaults and selections', () => {
  /** r -> {v0, v1 (latest)} -> t, both versions reach t. */
  const edited = () =>
    indexBufferGraph(
      [
        textNode('r', ''),
        textNode('v0', 'old', { at: 1 }),
        textNode('v1', 'new', { at: 2, editedFrom: 'v0' }),
        textNode('t', 't', { at: 3 }),
      ],
      [
        link('e0', ['r'], 'v0', 1),
        link('e1', ['r'], 'v1', 2),
        link('e2', ['v0', 'v1'], 't', 3),
      ]
    );

  it('exact sequence beats latest', () => {
    const graph = edited();
    const picks = [remember('v1', 'r', 9)];
    const result = resolveBufferPath(graph, ids('r', 'v0', 't'), picks, open);
    expect(result.nodeIds).toEqual(ids('r', 'v0', 't'));
    expect(result.issues).toEqual([]);
  });

  it('repairs a broken stored sequence from the first bad step', () => {
    const graph = edited();
    const result = resolveBufferPath(
      graph,
      ids('r', 'v0', 'ghost', 't'),
      [],
      open
    );
    expect(result.nodeIds).toEqual(ids('r', 'v0', 't'));
    expect(result.issues).toContainEqual({
      kind: 'sequence-repaired',
      validLength: 2,
    });
  });

  it('absent selection defaults deterministically', () => {
    const forward = edited();
    const [r, v0, v1, t] = ['r', 'v0', 'v1', 't'].map((n) =>
      forward.nodesById.get(id(n))!
    );
    const shuffled = indexBufferGraph(
      [t, v1, r, v0],
      [...forward.edgesById.values()].reverse()
    );
    for (const graph of [forward, shuffled]) {
      expect(resolveBufferPath(graph, [], [], open).nodeIds).toEqual(
        ids('r', 'v1', 't')
      );
    }
    // Same creation time: the larger id is the latest.
    const tie = indexBufferGraph(
      [
        textNode('r', ''),
        textNode('a', 'a', { at: 5 }),
        textNode('b', 'b', { at: 5, editedFrom: 'a' }),
      ],
      [link('ea', ['r'], 'a', 5), link('eb', ['r'], 'b', 5)]
    );
    expect(resolveBufferPath(tie, [], [], open).nodeIds).toEqual(ids('r', 'b'));
  });

  it('two paths on one tree choose different versions', () => {
    const graph = edited();
    const pathA = resolveBufferPath(graph, [], [remember('v0', 'r')], open);
    const pathB = resolveBufferPath(graph, [], [], open);
    expect(pathA.nodeIds).toEqual(ids('r', 'v0', 't'));
    expect(pathB.nodeIds).toEqual(ids('r', 'v1', 't'));
    // And each reports its own incoming selection for the shared child.
    expect(pathA.selections).toEqual([
      {
        targetNodeId: id('t'),
        selectedEdgeId: id('e2'),
        selectedSourceNodeId: id('v0'),
      },
    ]);
    expect(pathB.selections[0].selectedSourceNodeId).toBe(id('v1'));
  });

  it('a stale selection never traverses into another family', () => {
    const graph = indexBufferGraph(
      [...edited().nodesById.values(), textNode('x', 'x', { at: 99 })],
      [...edited().edgesById.values(), link('ex', ['r'], 'x', 99)]
    );
    // Branch x is newest, so it wins on family; a selection cannot change that,
    // and a selection naming a source outside the family or a bad edge is ignored.
    const stale = [
      remember('v0', 'x'),
      { ...remember('v0', 'r'), selectedEdgeId: id('e2') },
      remember('ghost', 'r'),
    ];
    const result = resolveBufferPath(graph, [], stale, open);
    expect(result.nodeIds).toEqual(ids('r', 'x'));
    const viaOther = resolveBufferPath(graph, ids('r', 'v0', 't'), stale, open);
    expect(viaOther.nodeIds).toEqual(ids('r', 'v0', 't'));
    const ignored = resolveBufferPath(edited(), [], stale, open);
    expect(ignored.nodeIds).toEqual(ids('r', 'v1', 't'));
  });

  it('opens an empty graph without throwing', () => {
    const result = resolveBufferPath(
      indexBufferGraph([], []),
      ids('a'),
      [],
      open
    );
    expect(result.nodeIds).toEqual([]);
    expect(result.leafId).toBeUndefined();
  });
});

describe('malformed graphs', () => {
  it('invalid/cyclic lineage cannot loop', () => {
    const graph = indexBufferGraph(
      [
        textNode('a', 'a', { editedFrom: 'b' }),
        textNode('b', 'b', { editedFrom: 'a' }),
        textNode('c', 'c', { editedFrom: 'missing' }),
        textNode('d', 'd', { editedFrom: 'd' }),
      ],
      [link('e1', ['a'], 'b'), link('e2', ['b'], 'a'), link('e3', ['c'], 'c')]
    );
    const kinds = graph.issues.map((i) => i.kind);
    expect(kinds).toContain('lineage-cycle');
    expect(kinds).toContain('broken-edited-from');
    expect(kinds).toContain('traversal-cycle');
    for (const [, versions] of graph.versionsOf)
      expect(versions.length).toBeGreaterThan(0);

    // The walk terminates whatever it is given.
    for (const start of [[], ids('a'), ids('a', 'b', 'a'), ids('c', 'c')]) {
      const result = resolveBufferPath(graph, start, [], open);
      expect(new Set(result.nodeIds).size).toBe(result.nodeIds.length);
    }
    const walk = indexBufferGraph(
      [
        textNode('x', 'x', { at: 1 }),
        textNode('y', 'y', { at: 2 }),
        textNode('r', '', { at: 0 }),
      ],
      [
        link('er', ['r'], 'x', 1),
        link('exy', ['x'], 'y', 2),
        link('eyx', ['y'], 'x', 3),
      ]
    );
    const result = resolveBufferPath(walk, [], [], open);
    expect(result.nodeIds).toEqual(ids('r', 'x', 'y'));
    expect(result.issues).toContainEqual({
      kind: 'walk-cycle',
      nodeId: id('y'),
    });
  });

  it('an edit of a cyclic lineage gets the same family whatever the input order', () => {
    const nodes = [
      textNode('a', 'a', { editedFrom: 'c' }),
      textNode('b', 'b', { editedFrom: 'a' }),
      textNode('c', 'c', { editedFrom: 'b' }),
      textNode('d', 'd', { editedFrom: 'a' }),
    ];
    const families = [nodes, [...nodes].reverse()].map(
      (order) => resolveVersionFamilies(order).familyOf
    );
    for (const name of ['a', 'b', 'c', 'd'])
      expect(families[1].get(id(name))).toBe(families[0].get(id(name)));
    expect(families[0].get(id('d'))).toBe(id('a'));
  });

  it('reports broken references and cross-tree hops and ignores those edges', () => {
    const graph = indexBufferGraph(
      [
        textNode('r', ''),
        textNode('a', 'a'),
        textNode('o', 'o', { tree: 'other', at: 5 }),
      ],
      [
        link('ok', ['r'], 'a'),
        link('broken', ['r'], 'nope'),
        link('hop', ['a'], 'o'),
        link('note', ['a'], 'r', 0, { type: 'annotation' }),
        link('ctx', ['a'], 'o', 0, { role: 'context' }),
      ]
    );
    expect(graph.issues).toContainEqual({
      kind: 'broken-edge-reference',
      edgeId: id('broken'),
      missingId: id('nope'),
    });
    expect(graph.issues).toContainEqual({
      kind: 'cross-tree-edge',
      edgeId: id('hop'),
    });
    expect(graph.outgoing.get(id('a'))).toBeUndefined();
    expect(resolveBufferPath(graph, [], [], open).nodeIds).toEqual(
      ids('r', 'a')
    );
  });
});
