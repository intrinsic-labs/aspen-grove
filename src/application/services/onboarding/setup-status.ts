import { shouldShowOnboarding, type FirstRunFacts } from './first-run';

export type SetupFacts = FirstRunFacts & {
  /**
   * Provider prefix of the agent new trees would use (`openrouter`,
   * `lmstudio`), or `null` when there is no model agent at all.
   */
  readonly defaultAgentProvider: string | null;
  /** An OpenRouter key is stored (or provided by the build). */
  readonly hasOpenRouterKey: boolean;
};

/**
 * Where the user stands before starting a tree:
 * - `first-run`: never onboarded; show the setup flow.
 * - `no-agent`: skipped setup and has no model agent yet.
 * - `no-key`: the default agent talks to OpenRouter but no key is stored.
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
  if (facts.defaultAgentProvider === 'openrouter' && !facts.hasOpenRouterKey) {
    return 'no-key';
  }
  return 'ready';
};
