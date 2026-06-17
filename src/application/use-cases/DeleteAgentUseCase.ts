import type {
  IAgentRepository,
  ILoomTreeRepository,
} from '@application/repositories';
import type { ULID } from '@domain/value-objects';

export type DeleteAgentInput = {
  readonly agentId: ULID;
  /**
   * Bypass the "in use" guard. Used only when the deletion is initiated by a
   * tree's lifecycle (e.g., the tree itself is being hard-deleted). Normal UI
   * paths should leave this `false`.
   */
  readonly force?: boolean;
};

export type DeleteAgentResult = {
  readonly deleted: boolean;
};

export type DeleteAgentDependencies = {
  readonly agentRepository: Pick<IAgentRepository, 'findById' | 'hardDelete'>;
  readonly loomTreeRepository: Pick<
    ILoomTreeRepository,
    'findByDefaultModelAgentId'
  >;
};

/**
 * Delete an Agent.
 *
 * Rules:
 * - Human agents cannot be deleted via this use case (they are managed
 *   separately as part of identity setup).
 * - Shared agents (`ownerTreeId === null`) cannot be deleted while any
 *   active LoomTree references them via `defaultModelAgentId`. The caller
 *   should re-point or delete those trees first, or surface the count to the
 *   user.
 * - Tree-owned agents (`ownerTreeId !== null`) are typically deleted as part
 *   of their owning tree's hard-delete cascade. If invoked directly, this use
 *   case will allow it provided no other tree references the agent (which
 *   should never happen, but we guard anyway).
 */
export class DeleteAgentUseCase {
  private readonly agentRepository: DeleteAgentDependencies['agentRepository'];
  private readonly loomTreeRepository: DeleteAgentDependencies['loomTreeRepository'];

  constructor(dependencies: DeleteAgentDependencies) {
    this.agentRepository = dependencies.agentRepository;
    this.loomTreeRepository = dependencies.loomTreeRepository;
  }

  async execute(input: DeleteAgentInput): Promise<DeleteAgentResult> {
    const agent = await this.agentRepository.findById(input.agentId);
    if (!agent) {
      return { deleted: false };
    }
    if (agent.type === 'human') {
      throw new Error(
        'Human agents cannot be deleted through this use case.'
      );
    }

    if (!input.force) {
      const referencingTrees =
        await this.loomTreeRepository.findByDefaultModelAgentId(
          input.agentId,
          true
        );
      if (referencingTrees.length > 0) {
        throw new Error(
          `Cannot delete agent ${input.agentId}: still referenced by ${referencingTrees.length} active tree(s). Re-point or archive those trees first.`
        );
      }
    }

    const deleted = await this.agentRepository.hardDelete(input.agentId);
    return { deleted };
  }
}
