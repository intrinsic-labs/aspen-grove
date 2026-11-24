import { isKeyedProvider } from '@domain/entities';
import { shouldShowOnboarding, type FirstRunFacts } from './first-run';

export type SetupFacts = FirstRunFacts & {
  /**
   * Provider prefix of the agent new trees would use (`openrouter`,
   * `anthropic`, `lmstudio`...), or `null` when there is no model agent.
   */
  readonly defaultAgentProvider: string | null;
  /** The default agent's provider has a key stored (or provided by the build). */
  readonly hasDefaultProviderKey: boolean;
};

/**
 * Where the user stands before starting a tree:
 * - `first-run`: never onboarded; show the setup flow.
 * - `no-agent`: skipped setup and has no model agent yet.
 * - `no-key`: the default agent talks to a hosted provider (OpenRouter,
 *   Anthropic, OpenAI) but no key is stored for it.
 * - `ready`: a tree can be started and can generate.
 *
 * LM Studio reachability is not checked here: it is a network call, and a
 * server that is down is reported where generation fails.
 */
export type SetupStatus = 'first-run' | 'no-agent' | 'no-key' | 'ready';

export const assessSetupStatus = (facts: SetupFacts): SetupStatus => {
  if (shouldShowOnboarding(facts)) {
    return 'first-run';
  }
  if (facts.defaultAgentProvider === null) {
    return 'no-agent';
  }
  if (
    isKeyedProvider(facts.defaultAgentProvider) &&
    !facts.hasDefaultProviderKey
  ) {
    return 'no-key';
  }
  return 'ready';
};
