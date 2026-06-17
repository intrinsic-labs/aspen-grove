import type {
  IAgentRepository,
  ILoomTreeRepository,
} from '@application/repositories';
import type { LoomTree } from '@domain/entities';
import type { ULID } from '@domain/value-objects';

export type UpdateTreeDefaultAgentInput = {
  readonly treeId: ULID;
  readonly modelAgentId: ULID;
};

export type UpdateTreeDefaultAgentDependencies = {
  readonly loomTreeRepository: Pick<ILoomTreeRepository, 'findById' | 'update'>;
  readonly agentRepository: Pick<IAgentRepository, 'findById'>;
};

/**
 * Switch a LoomTree to a different model Agent.
 *
 * Used when the user picks a different agent for their conversation from the
 * chat header. This does NOT modify either agent's configuration — it only
 * re-points the tree.
 */
export class UpdateTreeDefaultAgentUseCase {
  private readonly loomTreeRepository: UpdateTreeDefaultAgentDependencies['loomTreeRepository'];
  private readonly agentRepository: UpdateTreeDefaultAgentDependencies['agentRepository'];

  constructor(dependencies: UpdateTreeDefaultAgentDependencies) {
    this.loomTreeRepository = dependencies.loomTreeRepository;
    this.agentRepository = dependencies.agentRepository;
  }

  async execute(input: UpdateTreeDefaultAgentInput): Promise<LoomTree> {
    const tree = await this.loomTreeRepository.findById(input.treeId);
    if (!tree) {
      throw new Error(`LoomTree not found: ${input.treeId}`);
    }

    const agent = await this.agentRepository.findById(input.modelAgentId);
    if (!agent) {
      throw new Error(`Agent not found: ${input.modelAgentId}`);
    }
    if (agent.type !== 'model') {
      throw new Error(
        `Agent ${input.modelAgentId} is not a model agent (type=${agent.type}); cannot be used as a tree's default.`
      );
    }
    if (agent.archivedAt) {
      throw new Error(
        `Agent ${input.modelAgentId} is archived; restore or pick a different one.`
      );
    }
    // A tree-owned agent must belong to *this* tree if it's used here.
    if (agent.ownerTreeId && agent.ownerTreeId !== tree.id) {
      throw new Error(
        `Agent ${input.modelAgentId} is owned by a different tree and cannot be reused.`
      );
    }

    return this.loomTreeRepository.update({
      id: tree.id,
      changes: { defaultModelAgentId: agent.id },
    });
  }
}
