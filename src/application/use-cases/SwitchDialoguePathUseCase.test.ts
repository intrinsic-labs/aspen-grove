import { describe, expect, it, jest } from '@jest/globals';
import type {
  Edge,
  Node,
  Path,
  PathNode,
} from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import type { PathMode } from '@application/repositories';
import { SwitchDialoguePathUseCase } from './SwitchDialoguePathUseCase';

const now = new Date('2026-02-24T00:00:00.000Z');

describe('SwitchDialoguePathUseCase', () => {
  it('replaces only the divergent suffix and updates active node', async () => {
    const rootId = '01KROOT0000000000000000000' as ULID;
    const branchPointId = '01KUSER000000000000000000' as ULID;
    const currentAssistantId = '01KASSISTANTA00000000000' as ULID;
    const targetAssistantId = '01KASSISTANTB00000000000' as ULID;
    const treeId = '01KTREE0000000000000000000' as ULID;
    const pathId = '01KPATH0000000000000000000' as ULID;
    const ownerAgentId = '01KOWNER000000000000000000' as ULID;

    const nodesById = new Map<ULID, Node>([
      [
        rootId,
        {
          id: rootId,
          localId: 'root0001' as Node['localId'],
          loomTreeId: treeId,
          content: { type: 'text', text: 'root' },
          authorAgentId: ownerAgentId,
          authorType: 'human',
          contentHash:
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Node['contentHash'],
          createdAt: now,
          metadata: {
            bookmarked: false,
            pruned: false,
            excluded: false,
          },
        },
      ],
      [
        branchPointId,
        {
          id: branchPointId,
          localId: 'branch01' as Node['localId'],
          loomTreeId: treeId,
          content: { type: 'text', text: 'user turn' },
          authorAgentId: ownerAgentId,
          authorType: 'human',
          contentHash:
            'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Node['contentHash'],
          createdAt: now,
          metadata: {
            bookmarked: false,
            pruned: false,
            excluded: false,
          },
        },
      ],
      [
        currentAssistantId,
        {
          id: currentAssistantId,
          localId: 'assistA1' as Node['localId'],
          loomTreeId: treeId,
          content: { type: 'text', text: 'assistant A' },
          authorAgentId: '01KMODEL000000000000000000' as ULID,
          authorType: 'model',
          contentHash:
            'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as Node['contentHash'],
          createdAt: now,
          metadata: {
            bookmarked: false,
            pruned: false,
            excluded: false,
          },
        },
      ],
      [
        targetAssistantId,
        {
          id: targetAssistantId,
          localId: 'assistB1' as Node['localId'],
          loomTreeId: treeId,
          content: { type: 'text', text: 'assistant B' },
          authorAgentId: '01KMODEL000000000000000000' as ULID,
          authorType: 'model',
          contentHash:
            'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd' as Node['contentHash'],
          createdAt: now,
          metadata: {
            bookmarked: false,
            pruned: false,
            excluded: false,
          },
        },
      ],
    ]);

    const continuationByTarget = new Map<ULID, Edge[]>([
      [
        branchPointId,
        [
          {
            id: '01KEDGE1ROOT0000000000000' as ULID,
            loomTreeId: treeId,
            sources: [{ nodeId: rootId, role: 'primary' }],
            targetNodeId: branchPointId,
            edgeType: 'continuation',
            createdAt: now,
          },
        ],
      ],
      [
        currentAssistantId,
        [
          {
            id: '01KEDGE2A0000000000000000' as ULID,
            loomTreeId: treeId,
            sources: [{ nodeId: branchPointId, role: 'primary' }],
            targetNodeId: currentAssistantId,
            edgeType: 'continuation',
            createdAt: now,
          },
        ],
      ],
      [
        targetAssistantId,
        [
          {
            id: '01KEDGE2B0000000000000000' as ULID,
            loomTreeId: treeId,
            sources: [{ nodeId: branchPointId, role: 'primary' }],
            targetNodeId: targetAssistantId,
            edgeType: 'continuation',
            createdAt: now,
          },
        ],
      ],
    ]);

    const replaceSuffix = jest.fn(async () => undefined);
    const setActiveNode = jest.fn(async () => ({
      id: '01KPATHSTATE00000000000000' as ULID,
      pathId,
      agentId: ownerAgentId,
      activeNodeId: targetAssistantId,
      mode: 'dialogue' as PathMode,
      updatedAt: now,
    }));

    const useCase = new SwitchDialoguePathUseCase({
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
          [
            { id: '01KPATHNODE1' as ULID, pathId, position: 0, nodeId: rootId, createdAt: now },
            {
              id: '01KPATHNODE2' as ULID,
              pathId,
              position: 1,
              nodeId: branchPointId,
              createdAt: now,
            },
            {
              id: '01KPATHNODE3' as ULID,
              pathId,
              position: 2,
              nodeId: currentAssistantId,
              createdAt: now,
            },
          ] as PathNode[],
        replaceSuffix,
      },
      pathStateRepository: {
        setActiveNode,
      },
      nodeRepository: {
        findById: async (id) => nodesById.get(id) ?? null,
      },
      edgeRepository: {
        findContinuationsByTargetNodeId: async (targetId) =>
          continuationByTarget.get(targetId) ?? [],
      },
    });

    const result = await useCase.execute({
      pathId,
      ownerAgentId,
      targetNodeId: targetAssistantId,
    });

    expect(replaceSuffix).toHaveBeenCalledWith(pathId, 2, [targetAssistantId]);
    expect(setActiveNode).toHaveBeenCalledWith(
      pathId,
      ownerAgentId,
      targetAssistantId,
      'dialogue'
    );
    expect(result.replacedFromPosition).toBe(2);
    expect(result.activePathNodeIds).toEqual([rootId, branchPointId, targetAssistantId]);
    expect(result.previousActiveNodeId).toBe(currentAssistantId);
  });
});
