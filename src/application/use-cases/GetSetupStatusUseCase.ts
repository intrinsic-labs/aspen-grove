import type {
  IAgentRepository,
  IUserPreferencesRepository,
} from '@application/repositories';
import {
  assessSetupStatus,
  type SetupStatus,
} from '@application/services/onboarding';
import { resolveDefaultModelAgent } from '@application/services/resolve-default-model-agent';
import type { Agent } from '@domain/entities';

export type GetSetupStatusDependencies = {
  readonly agentRepository: Pick<
    IAgentRepository,
    'findById' | 'findSharedModels'
  >;
  readonly userPreferencesRepository: Pick<
    IUserPreferencesRepository,
    'get' | 'update'
  >;
  /** Whether an OpenRouter key is available (secure storage or build env). */
  readonly hasOpenRouterKey: () => Promise<boolean>;
};

export type GetSetupStatusResult = {
  readonly status: SetupStatus;
  /** The agent a new tree would use, when there is one. */
  readonly defaultAgent: Agent | null;
};

/** The provider prefix of an agent's `modelRef` (`openrouter:…` → `openrouter`). */
const providerOf = (agent: Agent | null): string | null => {
  if (!agent) {
    return null;
  }
  const modelRef = agent.modelRef ?? '';
  const colonIndex = modelRef.indexOf(':');
  return colonIndex === -1 ? '' : modelRef.slice(0, colonIndex);
};

/**
 * Gathers what decides the first-run flow and the Home / Loom Trees empty
 * states: onboarding done or skipped, the default model agent, and whether
 * its provider has a key.
 */
export class GetSetupStatusUseCase {
  constructor(private readonly dependencies: GetSetupStatusDependencies) {}

  async execute(): Promise<GetSetupStatusResult> {
    const { agentRepository, userPreferencesRepository, hasOpenRouterKey } =
      this.dependencies;

    const preferences = await userPreferencesRepository.get();
    const defaultAgent = await resolveDefaultModelAgent({
      agentRepository,
      userPreferencesRepository,
    });
    const sharedAgents = await agentRepository.findSharedModels(true);

    const status = assessSetupStatus({
      onboardingCompletedAt: preferences.onboardingCompletedAt,
      sharedModelAgentCount: sharedAgents.length,
      defaultAgentProvider: providerOf(defaultAgent),
      hasOpenRouterKey: await hasOpenRouterKey(),
    });

    return { status, defaultAgent };
  }
}
