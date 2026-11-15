import { describe, expect, it } from '@jest/globals';
import type { Edge, EdgeType } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { resolveBranchLeaf } from './resolve-branch-leaf';

const id = (name: string) => name as ULID;

const edge = (
  source: string,
  target: string,
  createdAtMs: number,
  edgeType: EdgeType = 'continuation'
): Edge => ({
  id: id(`${source}->${target}`),
  loomTreeId: id('tree'),
  sources: [{ nodeId: id(source), role: 'primary' }],
  targetNodeId: id(target),
  edgeType,
  createdAt: new Date(createdAtMs),
});

const withEdges = (edges: readonly Edge[]) => ({
  edgeRepository: {
    findBySourceNodeId: async (nodeId: ULID) =>
      edges.filter((candidate) =>
        candidate.sources.some((source) => source.nodeId === nodeId)
      ),
  },
});

//        root
//        /  \
//       a    b (newer)
//       |    |
//       a1   b1
//           /  \
//         b2    b3 (newer)
const tree = withEdges([
  edge('root', 'a', 1),
  edge('root', 'b', 2),
  edge('a', 'a1', 3),
  edge('b', 'b1', 4),
  edge('b1', 'b2', 5),
  edge('b1', 'b3', 6),
]);

describe('resolveBranchLeaf (Retrace Branch)', () => {
  it('follows the active path while it runs through the node', async () => {
    const path = [id('root'), id('b'), id('b1'), id('b2')];
    await expect(resolveBranchLeaf(id('b'), path, tree)).resolves.toBe('b2');
  });

  it('goes on past the end of the path along the newest continuations', async () => {
    const path = [id('root'), id('b')];
    await expect(resolveBranchLeaf(id('b'), path, tree)).resolves.toBe('b3');
  });

  it('follows the newest continuations from a node off the path', async () => {
    const path = [id('root'), id('b'), id('b1')];
    await expect(resolveBranchLeaf(id('a'), path, tree)).resolves.toBe('a1');
  });

  it('returns a leaf as it is, and ignores non-continuation edges', async () => {
    const graph = withEdges([edge('x', 'y', 1, 'annotation')]);
    await expect(resolveBranchLeaf(id('x'), [], graph)).resolves.toBe('x');
  });
});
