import type {
  IEdgeRepository,
  INodeRepository,
  IPathRepository,
  IPathStateRepository,
} from '@application/repositories';
import { resolveContinuationPathToNode } from '@application/services/resolve-continuation-path';
import type { ULID } from '@domain/value-objects';

export type SwitchDialoguePathInput = {
  readonly pathId: ULID;
  readonly ownerAgentId: ULID;
  readonly targetNodeId: ULID;
};

export type SwitchDialoguePathResult = {
  readonly pathId: ULID;
  readonly targetNodeId: ULID;
  readonly replacedFromPosition: number;
  readonly previousActiveNodeId?: ULID;
  readonly activePathNodeIds: readonly ULID[];
};

export type SwitchDialoguePathDependencies = {
  readonly pathRepository: Pick<IPathRepository, 'findById' | 'getNodeSequence' | 'replaceSuffix'>;
  readonly pathStateRepository: Pick<IPathStateRepository, 'setActiveNode'>;
  readonly nodeRepository: Pick<INodeRepository, 'findById'>;
  readonly edgeRepository: Pick<IEdgeRepository, 'findContinuationsByTargetNodeId'>;
};

/**
 * Switches the active dialogue path to a different node in the same tree.
 *
 * Implementation computes the target node ancestry (root -> target), then rewrites only
 * the divergent suffix via `replaceSuffix`.
 */
export class SwitchDialoguePathUseCase {
  private readonly pathRepository: SwitchDialoguePathDependencies['pathRepository'];
  private readonly pathStateRepository: SwitchDialoguePathDependencies['pathStateRepository'];
  private readonly nodeRepository: SwitchDialoguePathDependencies['nodeRepository'];
  private readonly edgeRepository: SwitchDialoguePathDependencies['edgeRepository'];

  constructor(dependencies: SwitchDialoguePathDependencies) {
    this.pathRepository = dependencies.pathRepository;
    this.pathStateRepository = dependencies.pathStateRepository;
    this.nodeRepository = dependencies.nodeRepository;
    this.edgeRepository = dependencies.edgeRepository;
  }

  async execute(input: SwitchDialoguePathInput): Promise<SwitchDialoguePathResult> {
    const [path, targetNode] = await Promise.all([
      this.pathRepository.findById(input.pathId),
      this.nodeRepository.findById(input.targetNodeId, true),
    ]);

    if (!path) {
      throw new Error(`Path not found: ${input.pathId}`);
    }
    if (!targetNode) {
      throw new Error(`Target node not found: ${input.targetNodeId}`);
    }
    if (path.loomTreeId !== targetNode.loomTreeId) {
      throw new Error('Target node does not belong to the selected path tree.');
    }

    const currentSequence = await this.pathRepository.getNodeSequence(path.id);
    const currentNodeIds = currentSequence.map((node) => node.nodeId);

    const targetPathNodeIds = await resolveContinuationPathToNode(targetNode.id, {
      nodeRepository: this.nodeRepository,
      edgeRepository: this.edgeRepository,
    });

    const replacedFromPosition = this.findDivergenceIndex(
      currentNodeIds,
      targetPathNodeIds
    );

    await this.pathRepository.replaceSuffix(
      path.id,
      replacedFromPosition,
      targetPathNodeIds.slice(replacedFromPosition)
    );

    await this.pathStateRepository.setActiveNode(
      path.id,
      input.ownerAgentId,
      targetNode.id,
      'dialogue'
    );

    return {
      pathId: path.id,
      targetNodeId: targetNode.id,
      replacedFromPosition,
      previousActiveNodeId: currentNodeIds[currentNodeIds.length - 1],
      activePathNodeIds: targetPathNodeIds,
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

