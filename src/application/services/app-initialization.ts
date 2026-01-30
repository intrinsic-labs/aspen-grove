/**
 * App Initialization Service
 *
 * Handles first-launch setup and ensures the app is in a valid state.
 * This service creates the foundational entities required for the app to function:
 * - UserPreferences singleton
 * - Owner Human Agent
 * - Default Grove
 *
 * @see docs/architecture/model/agents.md#default-agents for specification
 */

import type { IGroveRepository } from '../repositories/grove-repository';
import type { IAgentRepository } from '../repositories/agent-repository';
import type { IUserPreferencesRepository } from '../repositories/user-preferences-repository';
import type { Grove, Agent, UserPreferences, Ulid } from '../../domain';
import { AuthorType, DEFAULT_USER_PREFERENCES } from '../../domain';
import { generateUlid } from '../../domain/values';

/**
 * Result of app initialization
 */
export interface InitializationResult {
  /** Whether this was a fresh initialization (first launch) */
  isFirstLaunch: boolean;

  /** The user preferences (created or existing) */
  userPreferences: UserPreferences;

  /** The owner agent (created or existing) */
  ownerAgent: Agent;

  /** The default grove (created or existing) */
  grove: Grove;
}

/**
 * Dependencies required by the initialization service
 */
export interface AppInitializationDependencies {
  groveRepository: IGroveRepository;
  agentRepository: IAgentRepository;
  userPreferencesRepository: IUserPreferencesRepository;
}

/**
 * Service responsible for initializing the app on first launch.
 *
 * This service is idempotent - calling it multiple times is safe.
 * On subsequent launches, it simply returns the existing entities.
 */
export class AppInitializationService {
  private readonly groveRepository: IGroveRepository;
  private readonly agentRepository: IAgentRepository;
  private readonly userPreferencesRepository: IUserPreferencesRepository;

  constructor(deps: AppInitializationDependencies) {
    this.groveRepository = deps.groveRepository;
    this.agentRepository = deps.agentRepository;
    this.userPreferencesRepository = deps.userPreferencesRepository;
  }

  /**
   * Initialize the app, creating foundational entities if needed.
   *
   * This method is idempotent and safe to call on every app launch.
   * It will:
   * 1. Check if initialization has already occurred
   * 2. If not, create UserPreferences, owner Agent, and Grove
   * 3. Return the initialization result with all entities
   *
   * @returns Promise resolving to the initialization result
   */
  async initialize(): Promise<InitializationResult> {
    // Check if already initialized by looking for existing Grove
    const existingGrove = await this.groveRepository.getDefault();

    if (existingGrove) {
      // Already initialized - fetch existing entities
      return this.getExistingEntities(existingGrove);
    }

    // First launch - create all foundational entities
    return this.performFirstLaunchSetup();
  }

  /**
   * Check if the app has been initialized.
   *
   * @returns Promise resolving to true if initialized, false otherwise
   */
  async isInitialized(): Promise<boolean> {
    const grove = await this.groveRepository.getDefault();
    return grove !== null;
  }

  /**
   * Fetch existing entities when app is already initialized.
   */
  private async getExistingEntities(grove: Grove): Promise<InitializationResult> {
    const userPreferences = await this.userPreferencesRepository.getOrThrow();
    const ownerAgent = await this.agentRepository.findOwner();

    return {
      isFirstLaunch: false,
      userPreferences,
      ownerAgent,
      grove,
    };
  }

  /**
   * Perform first-launch setup by creating all foundational entities.
   *
   * Order matters here:
   * 1. UserPreferences first (provides display name for Agent)
   * 2. Owner Agent second (Grove needs ownerAgentId)
   * 3. Grove last (depends on Agent)
   */
  private async performFirstLaunchSetup(): Promise<InitializationResult> {
    console.log('[AppInitialization] First launch detected, creating foundational entities...');

    // 1. Create UserPreferences singleton
    const userPreferencesId = generateUlid() as Ulid;
    const userPreferences = await this.userPreferencesRepository.create({
      id: userPreferencesId,
      displayName: DEFAULT_USER_PREFERENCES.displayName,
      theme: DEFAULT_USER_PREFERENCES.theme,
      fontSize: DEFAULT_USER_PREFERENCES.fontSize,
      fontFace: DEFAULT_USER_PREFERENCES.fontFace,
      nodeViewStyle: DEFAULT_USER_PREFERENCES.nodeViewStyle,
      nodeViewCornerRadius: DEFAULT_USER_PREFERENCES.nodeViewCornerRadius,
      defaultVoiceModeEnabled: DEFAULT_USER_PREFERENCES.defaultVoiceModeEnabled,
      verboseErrorAlerts: DEFAULT_USER_PREFERENCES.verboseErrorAlerts,
    });
    console.log('[AppInitialization] Created UserPreferences:', userPreferencesId);

    // 2. Create owner Human Agent
    const ownerAgentId = generateUlid() as Ulid;
    const ownerAgent = await this.agentRepository.create({
      id: ownerAgentId,
      name: userPreferences.displayName,
      type: AuthorType.Human,
      modelRef: null, // Human agents don't have a model reference (per spec)
      loomAware: true, // Human agents are loom-aware by default (per spec)
      permissions: {
        read: true,
        write: true,
      },
      // configuration uses defaults - human agents don't use these settings
    });
    console.log('[AppInitialization] Created owner Agent:', ownerAgentId);

    // 3. Create default Grove
    const groveId = generateUlid() as Ulid;
    const grove = await this.groveRepository.create({
      id: groveId,
      name: 'My Grove',
      ownerAgentId: ownerAgentId,
    });
    console.log('[AppInitialization] Created Grove:', groveId);

    console.log('[AppInitialization] First launch setup complete!');

    return {
      isFirstLaunch: true,
      userPreferences,
      ownerAgent,
      grove,
    };
  }
}

/**
 * Factory function to create an AppInitializationService with dependencies.
 *
 * This is useful for dependency injection in the app's composition root.
 */
export function createAppInitializationService(
  deps: AppInitializationDependencies
): AppInitializationService {
  return new AppInitializationService(deps);
}
