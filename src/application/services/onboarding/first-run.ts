/**
 * What the app knows on launch that decides whether to show first-run setup.
 */
export type FirstRunFacts = {
  /** Set once the user finished or skipped onboarding. */
  readonly onboardingCompletedAt?: Date;
  /** Shared (library) model agents that are not archived. */
  readonly sharedModelAgentCount: number;
};

/**
 * A user counts as onboarded once they have finished or skipped the
 * first-run setup, or already have a model agent (an install that predates
 * onboarding, or one set up through Settings → Agents).
 */
export const isOnboarded = (facts: FirstRunFacts): boolean =>
  facts.onboardingCompletedAt !== undefined || facts.sharedModelAgentCount > 0;

/** Onboarding shows on launch only for a user who is not yet onboarded. */
export const shouldShowOnboarding = (facts: FirstRunFacts): boolean =>
  !isOnboarded(facts);
