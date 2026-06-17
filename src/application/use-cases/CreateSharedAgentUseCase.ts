import type { IAgentRepository } from '@application/repositories';
import type {
  Agent,
  AgentConfiguration,
  AgentPermissions,
} from '@domain/entities';
import type { ModelRef } from '@domain/value-objects';

export type CreateSharedAgentInput = {
  readonly name: string;
  readonly modelRef: ModelRef;
  readonly configuration?: AgentConfiguration;
  readonly permissions?: AgentPermissions;
};

export type CreateSharedAgentDependencies = {
  readonly agentRepository: Pick<IAgentRepository, 'create'>;
};

/**
 * Create a new shared (library) model Agent.
 *
 * Shared agents live in the Settings → Agents library. They have
 * `ownerTreeId === null` and may be referenced by any number of LoomTrees.
 *
 * For ad-hoc, tree-private agents created from a chat header, use
 * `ForkAgentForTreeUseCase` (clones from a shared agent) instead — there's no
 * direct "create tree-owned from scratch" path today because the chat flow
 * always starts from an existing agent.
 */
export class CreateSharedAgentUseCase {
  private readonly agentRepository: CreateSharedAgentDependencies['agentRepository'];

  constructor(dependencies: CreateSharedAgentDependencies) {
    this.agentRepository = dependencies.agentRepository;
  }

  async execute(input: CreateSharedAgentInput): Promise<Agent> {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new Error('Agent name must not be empty');
    }

    return this.agentRepository.create({
      name,
      type: 'model',
      modelRef: input.modelRef,
      configuration: input.configuration,
      permissions: input.permissions,
      // Explicitly omitted: ownerTreeId. Shared agents have no owner tree.
    });
  }
}
