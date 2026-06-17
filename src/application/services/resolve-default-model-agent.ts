import type {
  IAgentRepository,
  IUserPreferencesRepository,
} from '@application/repositories';
import type { Agent } from '@domain/entities';

export type ResolveDefaultModelAgentDependencies = {
  readonly agentRepository: Pick<
    IAgentRepository,
    'findById' | 'findSharedModels'
  >;
  readonly userPreferencesRepository: Pick<
    IUserPreferencesRepository,
    'get' | 'update'
  >;
};

/**
 * Resolve the model Agent that should be used for a new LoomTree.
 *
 * Resolution order:
 * 1. The user-pinned `UserPreferences.defaultModelAgentId`, if it still refers
 *    to an active, non-archived model agent.
 * 2. Otherwise, the first available shared (library) model agent.
 * 3. Otherwise, `null` — the caller must surface this to the user (Phase 3
 *    placeholder: an error pointing at Settings).
 *
 * If the pinned default is stale (deleted or archived), it's cleared so the
 * user isn't repeatedly hitting the same dead reference.
 */
export const resolveDefaultModelAgent = async (
  dependencies: ResolveDefaultModelAgentDependencies
): Promise<Agent | null> => {
  const prefs = await dependencies.userPreferencesRepository.get();

  if (prefs.defaultModelAgentId) {
    const pinned = await dependencies.agentRepository.findById(
      prefs.defaultModelAgentId
    );
    if (pinned && pinned.type === 'model' && !pinned.archivedAt) {
      return pinned;
    }

    // Pinned default is stale — clear it so we don't keep checking.
    await dependencies.userPreferencesRepository.update({
      defaultModelAgentId: null,
    });
  }

  const sharedAgents = await dependencies.agentRepository.findSharedModels(true);
  return sharedAgents[0] ?? null;
};

/**
 * Set `UserPreferences.defaultModelAgentId` to the given agent only if no
 * pin is currently in place. This is the "first agent the user configures
 * becomes the default" behavior the Settings save flow uses.
 *
 * If a pin already exists (even if stale), this is a no-op. Replacing the
 * pin is a deliberate user action; we don't want every settings save to
 * silently reroute future trees.
 */
export const pinDefaultModelAgentIfUnset = async (
  agentId: string,
  dependencies: Pick<
    ResolveDefaultModelAgentDependencies,
    'userPreferencesRepository'
  >
): Promise<void> => {
  const prefs = await dependencies.userPreferencesRepository.get();
  if (prefs.defaultModelAgentId) {
    return;
  }
  await dependencies.userPreferencesRepository.update({
    defaultModelAgentId: agentId as Agent['id'],
  });
};
