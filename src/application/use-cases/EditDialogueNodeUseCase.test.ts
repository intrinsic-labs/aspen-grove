import { describe, expect, it, jest } from '@jest/globals';
import type {
  Edge,
  Node,
  Path,
  PathMode,
  PathNode,
  PathState,
} from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { EditDialogueNodeUseCase } from './EditDialogueNodeUseCase';

const now = new Date('2026-02-26T12:00:00.000Z');

const createNode = (input: {
  readonly id: ULID;
  readonly loomTreeId: ULID;
  readonly authorAgentId: ULID;
  readonly authorType: 'human' | 'model';
  readonly text: string;
  readonly localId: string;
  readonly contentHash: string;
  readonly editedFrom?: ULID;
}): Node => ({
  id: input.id,
  localId: input.localId as Node['localId'],
  loomTreeId: input.loomTreeId,
  content: { type: 'text', text: input.text },
  authorAgentId: input.authorAgentId,
  authorType: input.authorType,
  contentHash: input.contentHash as Node['contentHash'],
  createdAt: now,
  editedFrom: input.editedFrom,
  metadata: {
    bookmarked: false,
    pruned: false,
    excluded: false,
  },
});

describe('EditDialogueNodeUseCase', () => {
  it('creates edited node with editedFrom lineage and rewrites path suffix', async () => {
    const ownerAgentId = '01KOWNER000000000000000000' as ULID;
    const modelAgentId = '01KMODEL000000000000000000' as ULID;
    const treeId = '01KTREE0000000000000000000' as ULID;
    const pathId = '01KPATH0000000000000000000' as ULID;
    const rootId = '01KROOT0000000000000000000' as ULID;
    const userId = '01KUSER0000000000000000000' as ULID;
    const targetModelId = '01KTARGET0000000000000000' as ULID;
    const downstreamId = '01KDOWN000000000000000000' as ULID;

    const nodesById = new Map<ULID, Node>([
      [
        rootId,
        createNode({
          id: rootId,
          loomTreeId: treeId,
          authorAgentId: ownerAgentId,
          authorType: 'human',
          text: 'root',
          localId: 'root0001',
          contentHash:
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        }),
      ],
      [
        userId,
        createNode({
          id: userId,
          loomTreeId: treeId,
          authorAgentId: ownerAgentId,
          authorType: 'human',
          text: 'user asks',
          localId: 'user0001',
          contentHash:
            'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        }),
      ],
      [
        targetModelId,
        createNode({
          id: targetModelId,
          loomTreeId: treeId,
          authorAgentId: modelAgentId,
          authorType: 'model',
          text: 'original model response',
          localId: 'model001',
          contentHash:
            'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        }),
      ],
      [
        downstreamId,
        createNode({
          id: downstreamId,
          loomTreeId: treeId,
          authorAgentId: ownerAgentId,
          authorType: 'human',
          text: 'later content',
          localId: 'later001',
          contentHash:
            'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        }),
      ],
    ]);

    const edges: Edge[] = [
      {
        id: '01KEDGE000000000000000001' as ULID,
        loomTreeId: treeId,
        sources: [{ nodeId: rootId, role: 'primary' }],
        targetNodeId: userId,
        edgeType: 'continuation',
        createdAt: now,
      },
      {
        id: '01KEDGE000000000000000002' as ULID,
        loomTreeId: treeId,
        sources: [{ nodeId: userId, role: 'primary' }],
        targetNodeId: targetModelId,
        edgeType: 'continuation',
        createdAt: now,
      },
      {
        id: '01KEDGE000000000000000003' as ULID,
        loomTreeId: treeId,
        sources: [{ nodeId: targetModelId, role: 'primary' }],
        targetNodeId: downstreamId,
        edgeType: 'continuation',
        createdAt: now,
      },
    ];

    const pathNodeIds: ULID[] = [rootId, userId, targetModelId, downstreamId];

    const replaceSuffix = jest.fn<
      (targetPathId: ULID, startPosition: number, nodeIds: readonly ULID[]) => Promise<void>
    >(async (targetPathId, startPosition, nodeIds) => {
      expect(targetPathId).toBe(pathId);
      pathNodeIds.splice(startPosition, pathNodeIds.length - startPosition, ...nodeIds);
    });

    const setActiveNode = jest.fn<
      (pathInputId: ULID, agentId: ULID, activeNodeId: ULID, mode?: PathMode) => Promise<PathState>
    >(async () => ({
      id: '01KPATHSTATE00000000000000' as ULID,
      pathId,
      agentId: ownerAgentId,
      activeNodeId: targetModelId,
      mode: 'dialogue' as PathMode,
      updatedAt: now,
    }));

    const useCase = new EditDialogueNodeUseCase({
      nodeRepository: {
        findById: async (id) => nodesById.get(id) ?? null,
        create: async (input) => {
          const node = createNode({
            id: input.id ?? ('01KNEWNODE000000000000000' as ULID),
            loomTreeId: input.loomTreeId,
            authorAgentId: input.authorAgentId,
            authorType: input.authorType,
            text: input.content.type === 'text' ? input.content.text : '[non-text]',
            localId: String(input.localId),
            contentHash: input.contentHash,
            editedFrom: input.editedFrom,
          });
          nodesById.set(node.id, node);
          return node;
        },
        getAllLocalIds: async () =>
          new Set(Array.from(nodesById.values()).map((node) => node.localId)),
      },
      edgeRepository: {
        create: async (input) => {
          const edge: Edge = {
            id: `edge-${edges.length + 1}` as ULID,
            loomTreeId: input.loomTreeId,
            sources: input.sources,
            targetNodeId: input.targetNodeId,
            edgeType: input.edgeType,
            createdAt: now,
          };
          edges.push(edge);
          return edge;
        },
        findContinuationsByTargetNodeId: async (targetNodeId) =>
          edges.filter(
            (edge) =>
              edge.targetNodeId === targetNodeId &&
              edge.edgeType === 'continuation'
          ),
      },
      pathRepository: {
        findById: async (id) =>
          id === pathId
            ? ({
                id: pathId,
                loomTreeId: treeId,
                ownerAgentId,
                createdAt: now,
                updatedAt: now,
              } as Path)
            : null,
        getNodeSequence: async () =>
          pathNodeIds.map(
            (nodeId, position) =>
              ({
                id: `path-node-${position + 1}` as ULID,
                pathId,
                nodeId,
                position,
                createdAt: now,
              }) as PathNode
          ),
        replaceSuffix,
      },
      pathStateRepository: {
        setActiveNode,
      },
    });

    const result = await useCase.execute({
      session: {
        ownerAgentId,
        treeId,
        pathId,
      },
      targetNodeId: targetModelId,
      editedText: 'edited content',
    });

    expect(result.editedNodeId).toBeDefined();
    expect(result.editedFromNodeId).toBe(targetModelId);
    expect(result.parentNodeId).toBe(userId);
    expect(result.activePathNodeIds).toEqual([rootId, userId, result.editedNodeId]);
    expect(result.replacedFromPosition).toBe(2);
    expect(pathNodeIds).toEqual([rootId, userId, result.editedNodeId]);

    const editedNode = nodesById.get(result.editedNodeId);
    expect(editedNode?.editedFrom).toBe(targetModelId);
    expect(editedNode?.authorType).toBe('human');
    expect(editedNode?.content.type).toBe('text');
    if (editedNode?.content.type === 'text') {
      expect(editedNode.content.text).toBe('edited content');
    }
    expect(replaceSuffix).toHaveBeenCalledTimes(1);
    expect(setActiveNode).toHaveBeenCalledTimes(1);
  });
});
