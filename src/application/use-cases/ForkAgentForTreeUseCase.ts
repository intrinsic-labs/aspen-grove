import type {
  IAgentRepository,
  ILoomTreeRepository,
} from '@application/repositories';
import type { Agent, LoomTree } from '@domain/entities';
import type { ULID } from '@domain/value-objects';

export type ForkAgentForTreeInput = {
  readonly sourceAgentId: ULID;
  readonly treeId: ULID;
  /**
   * Optional override for the forked agent's display name. Defaults to
   * `"{sourceAgent.name} (this conversation)"`.
   */
  readonly name?: string;
};

export type ForkAgentForTreeResult = {
  readonly forkedAgent: Agent;
  readonly tree: LoomTree;
};

export type ForkAgentForTreeDependencies = {
  readonly agentRepository: Pick<IAgentRepository, 'findById' | 'create'>;
  readonly loomTreeRepository: Pick<ILoomTreeRepository, 'findById' | 'update'>;
};

/**
 * Fork a shared Agent into a tree-owned copy and re-point the tree at it.
 *
 * This is the "Customize for this conversation only" action in the chat
 * header. The original (shared) agent is left untouched; future edits to the
 * tree's settings will mutate the forked copy in isolation.
 *
 * The fork carries over the source agent's configuration, modelRef, and
 * permissions. The `ownerTreeId` is set to the tree id, making the new agent
 * private to that conversation.
 */
export class ForkAgentForTreeUseCase {
  private readonly agentRepository: ForkAgentForTreeDependencies['agentRepository'];
  private readonly loomTreeRepository: ForkAgentForTreeDependencies['loomTreeRepository'];

  constructor(dependencies: ForkAgentForTreeDependencies) {
    this.agentRepository = dependencies.agentRepository;
    this.loomTreeRepository = dependencies.loomTreeRepository;
  }

  async execute(input: ForkAgentForTreeInput): Promise<ForkAgentForTreeResult> {
    const sourceAgent = await this.agentRepository.findById(input.sourceAgentId);
    if (!sourceAgent) {
      throw new Error(`Source agent not found: ${input.sourceAgentId}`);
    }
    if (sourceAgent.type !== 'model') {
      throw new Error(
        `Cannot fork agent ${input.sourceAgentId}: only model agents may be forked.`
      );
    }
    if (sourceAgent.ownerTreeId) {
      throw new Error(
        `Agent ${input.sourceAgentId} is already tree-owned; nothing to fork.`
      );
    }

    const tree = await this.loomTreeRepository.findById(input.treeId);
    if (!tree) {
      throw new Error(`LoomTree not found: ${input.treeId}`);
    }

    const name = input.name?.trim() || `${sourceAgent.name} (this conversation)`;

    const forkedAgent = await this.agentRepository.create({
      name,
      type: 'model',
      modelRef: sourceAgent.modelRef,
      configuration: sourceAgent.configuration,
      permissions: sourceAgent.permissions,
      ownerTreeId: tree.id,
    });

    const updatedTree = await this.loomTreeRepository.update({
      id: tree.id,
      changes: { defaultModelAgentId: forkedAgent.id },
    });

    return { forkedAgent, tree: updatedTree };
  }
}
