import type {
  Agent,
  Grove,
  UserPreferences,
} from '@domain/entities';
import type {
  IAgentRepository,
  IGroveRepository,
  IUserPreferencesRepository,
} from '@application/repositories';

const DEFAULT_GROVE_NAME = 'My Grove';

const OWNER_PERMISSIONS = {
  loomAware: true,
  loomWrite: true,
  loomGenerate: true,
  docRead: true,
  docWrite: true,
} as const;

export type InitializeAppDefaultsResult = {
  readonly userPreferences: UserPreferences;
  readonly ownerAgent: Agent;
  readonly grove: Grove;
};

export type InitializeAppDefaultsDependencies = {
  readonly userPreferencesRepository: IUserPreferencesRepository;
  readonly agentRepository: IAgentRepository;
  readonly groveRepository: IGroveRepository;
};

/**
 * Ensures first-launch defaults exist (idempotent):
 * - UserPreferences singleton
 * - Owner human Agent
 * - Grove owned by that agent
 */
export class InitializeAppDefaultsUseCase {
  private readonly userPreferencesRepository: IUserPreferencesRepository;
  private readonly agentRepository: IAgentRepository;
  private readonly groveRepository: IGroveRepository;

  constructor(dependencies: InitializeAppDefaultsDependencies) {
    this.userPreferencesRepository = dependencies.userPreferencesRepository;
    this.agentRepository = dependencies.agentRepository;
    this.groveRepository = dependencies.groveRepository;
  }

  async execute(): Promise<InitializeAppDefaultsResult> {
    const userPreferences = await this.userPreferencesRepository.get();

    const ownerWithGrove = await this.findExistingOwnerWithGrove();
    if (ownerWithGrove) {
      return {
        userPreferences,
        ownerAgent: ownerWithGrove.ownerAgent,
        grove: ownerWithGrove.grove,
      };
    }

    const ownerAgent =
      (await this.findAnyActiveHumanAgent()) ??
      (await this.agentRepository.create({
        name: userPreferences.displayName ?? 'Human',
        type: 'human',
        configuration: {},
        permissions: OWNER_PERMISSIONS,
      }));

    const existingGrove = await this.groveRepository.findByOwnerAgentId(ownerAgent.id);
    const grove =
      existingGrove ??
      (await this.groveRepository.create({
        name: DEFAULT_GROVE_NAME,
        ownerAgentId: ownerAgent.id,
      }));

    return {
      userPreferences,
      ownerAgent,
      grove,
    };
  }

  private async findAnyActiveHumanAgent(): Promise<Agent | null> {
    const humans = await this.agentRepository.findHumans(true);
    if (humans.length === 0) {
      return null;
    }
    return humans[0];
  }

  private async findExistingOwnerWithGrove(): Promise<{
    ownerAgent: Agent;
    grove: Grove;
  } | null> {
    const humans = await this.agentRepository.findHumans(true);

    for (const human of humans) {
      const grove = await this.groveRepository.findByOwnerAgentId(human.id);
      if (grove) {
        return {
          ownerAgent: human,
          grove,
        };
      }
    }

    return null;
  }
}
