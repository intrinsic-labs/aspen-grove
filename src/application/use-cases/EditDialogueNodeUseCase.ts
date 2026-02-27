import type {
  IEdgeRepository,
  INodeRepository,
  IPathRepository,
  IPathStateRepository,
} from '@application/repositories';
import { computeHumanContentHash } from '@application/services/content-hash-service';
import { resolveContinuationPathToNode } from '@application/services/resolve-continuation-path';
import {
  createLocalId,
  createULID,
  type ULID,
} from '@domain/value-objects';

export type EditDialogueNodeSession = {
  readonly ownerAgentId: ULID;
  readonly treeId: ULID;
  readonly pathId: ULID;
};

export type EditDialogueNodeInput = {
  readonly session: EditDialogueNodeSession;
  readonly targetNodeId: ULID;
  readonly editedText: string;
};

export type EditDialogueNodeResult = {
  readonly editedNodeId: ULID;
  readonly editedFromNodeId: ULID;
  readonly parentNodeId: ULID;
  readonly replacedFromPosition: number;
  readonly activePathNodeIds: readonly ULID[];
};

export type EditDialogueNodeDependencies = {
  readonly nodeRepository: Pick<
    INodeRepository,
    'findById' | 'create' | 'getAllLocalIds'
  >;
  readonly edgeRepository: Pick<
    IEdgeRepository,
    'create' | 'findContinuationsByTargetNodeId'
  >;
  readonly pathRepository: Pick<IPathRepository, 'findById' | 'getNodeSequence' | 'replaceSuffix'>;
  readonly pathStateRepository: Pick<IPathStateRepository, 'setActiveNode'>;
};

/**
 * Creates an edited replacement node in Dialogue mode.
 *
 * Behavior:
 * - original node remains immutable
 * - new node sets `editedFrom`
 * - new node branches from original parent
 * - active path is rewritten to end at edited node
 */
export class EditDialogueNodeUseCase {
  private readonly nodeRepository: EditDialogueNodeDependencies['nodeRepository'];
  private readonly edgeRepository: EditDialogueNodeDependencies['edgeRepository'];
  private readonly pathRepository: EditDialogueNodeDependencies['pathRepository'];
  private readonly pathStateRepository: EditDialogueNodeDependencies['pathStateRepository'];

  constructor(dependencies: EditDialogueNodeDependencies) {
    this.nodeRepository = dependencies.nodeRepository;
    this.edgeRepository = dependencies.edgeRepository;
    this.pathRepository = dependencies.pathRepository;
    this.pathStateRepository = dependencies.pathStateRepository;
  }

  async execute(input: EditDialogueNodeInput): Promise<EditDialogueNodeResult> {
    const editedText = input.editedText.trim();
    if (!editedText) {
      throw new Error('Edited text must not be empty.');
    }

    const [path, targetNode] = await Promise.all([
      this.pathRepository.findById(input.session.pathId),
      this.nodeRepository.findById(input.targetNodeId, true),
    ]);

    if (!path) {
      throw new Error(`Path not found: ${input.session.pathId}`);
    }
    if (!targetNode) {
      throw new Error(`Target node not found: ${input.targetNodeId}`);
    }
    if (path.loomTreeId !== targetNode.loomTreeId) {
      throw new Error('Target node does not belong to the selected path tree.');
    }
    if (path.loomTreeId !== input.session.treeId) {
      throw new Error('Session treeId does not match the selected path.');
    }

    const incoming = await this.edgeRepository.findContinuationsByTargetNodeId(
      targetNode.id
    );
    if (incoming.length === 0) {
      throw new Error('Editing root node is not supported in Dialogue mode.');
    }
    if (incoming.length > 1) {
      throw new Error(
        `Ambiguous edit target: node ${targetNode.id} has ${incoming.length} incoming continuation edges.`
      );
    }

    const [incomingEdge] = incoming;
    const parentSource =
      incomingEdge.sources.find((source) => source.role === 'primary') ??
      incomingEdge.sources[0];
    if (!parentSource) {
      throw new Error(`Invalid continuation edge ${incomingEdge.id}: no sources.`);
    }

    const parentNode = await this.nodeRepository.findById(parentSource.nodeId, true);
    if (!parentNode) {
      throw new Error(`Parent node not found: ${parentSource.nodeId}`);
    }

    const editedNodeId = createULID();
    const createdAt = new Date();
    const localIds = await this.nodeRepository.getAllLocalIds(input.session.treeId);
    const localId = createLocalId(editedNodeId, localIds);
    const content = { type: 'text' as const, text: editedText };
    const contentHash = await computeHumanContentHash(
      content,
      [parentNode.contentHash],
      createdAt,
      input.session.ownerAgentId
    );

    const editedNode = await this.nodeRepository.create({
      id: editedNodeId,
      createdAt,
      loomTreeId: input.session.treeId,
      localId,
      content,
      authorAgentId: input.session.ownerAgentId,
      authorType: 'human',
      contentHash,
      editedFrom: targetNode.id,
    });

    await this.edgeRepository.create({
      loomTreeId: input.session.treeId,
      sources: [{ nodeId: parentNode.id, role: 'primary' }],
      targetNodeId: editedNode.id,
      edgeType: 'continuation',
    });

    const targetPathNodeIds = await resolveContinuationPathToNode(targetNode.id, {
      nodeRepository: this.nodeRepository,
      edgeRepository: this.edgeRepository,
    });
    const nextPathNodeIds = [
      ...targetPathNodeIds.slice(0, Math.max(0, targetPathNodeIds.length - 1)),
      editedNode.id,
    ];

    const currentSequence = await this.pathRepository.getNodeSequence(path.id);
    const currentNodeIds = currentSequence.map((node) => node.nodeId);
    const replacedFromPosition = this.findDivergenceIndex(
      currentNodeIds,
      nextPathNodeIds
    );

    await this.pathRepository.replaceSuffix(
      path.id,
      replacedFromPosition,
      nextPathNodeIds.slice(replacedFromPosition)
    );
    await this.pathStateRepository.setActiveNode(
      path.id,
      input.session.ownerAgentId,
      editedNode.id,
      'dialogue'
    );

    return {
      editedNodeId: editedNode.id,
      editedFromNodeId: targetNode.id,
      parentNodeId: parentNode.id,
      replacedFromPosition,
      activePathNodeIds: nextPathNodeIds,
    };
  }

  private findDivergenceIndex(
    currentNodeIds: readonly ULID[],
    targetNodeIds: readonly ULID[]
  ): number {
    let index = 0;
    const minimum = Math.min(currentNodeIds.length, targetNodeIds.length);
    while (index < minimum && currentNodeIds[index] === targetNodeIds[index]) {
      index += 1;
    }
    return index;
  }
}
