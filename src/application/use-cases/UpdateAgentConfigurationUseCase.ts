import type { IAgentRepository } from '@application/repositories';
import type { Agent, AgentConfiguration } from '@domain/entities';
import type { ModelRef, ULID } from '@domain/value-objects';

export type UpdateAgentConfigurationInput = {
  readonly agentId: ULID;
  readonly changes: {
    readonly name?: string;
    readonly modelRef?: ModelRef;
    readonly configuration?: Partial<AgentConfiguration>;
  };
};

export type UpdateAgentConfigurationDependencies = {
  readonly agentRepository: Pick<IAgentRepository, 'findById' | 'update'>;
};

/**
 * Mutate an Agent's display name, model reference, or generation
 * configuration (system prompt, temperature, etc.).
 *
 * This is provider-agnostic and works for both shared and tree-owned agents.
 * Callers determine the audience of the change — editing a shared agent
 * propagates to every tree referencing it; editing a tree-owned agent affects
 * only the owning tree. The decision of which is appropriate happens in the
 * UI before invoking this use case (see `ForkAgentForTreeUseCase` for the
 * "fork before editing" path).
 *
 * The `configuration` field is merged on top of the existing configuration,
 * not replaced wholesale, so callers only need to supply the keys they want
 * to change.
 */
export class UpdateAgentConfigurationUseCase {
  private readonly agentRepository: UpdateAgentConfigurationDependencies['agentRepository'];

  constructor(dependencies: UpdateAgentConfigurationDependencies) {
    this.agentRepository = dependencies.agentRepository;
  }

  async execute(input: UpdateAgentConfigurationInput): Promise<Agent> {
    const existing = await this.agentRepository.findById(input.agentId);
    if (!existing) {
      throw new Error(`Agent not found: ${input.agentId}`);
    }
    if (existing.type === 'human' && input.changes.modelRef !== undefined) {
      throw new Error('Human agents cannot have a modelRef');
    }

    const mergedConfiguration: AgentConfiguration | undefined =
      input.changes.configuration === undefined
        ? undefined
        : { ...existing.configuration, ...input.changes.configuration };

    return this.agentRepository.update({
      id: input.agentId,
      changes: {
        name: input.changes.name,
        modelRef: input.changes.modelRef,
        configuration: mergedConfiguration,
      },
    });
  }
}
