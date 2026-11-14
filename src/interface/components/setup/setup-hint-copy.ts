import type { SetupStatus } from '@application/services/onboarding';
import { ONBOARDING_SETUP_HREF } from '../onboarding/onboarding-routes';

export type SetupHintCopy = {
  readonly message: string;
  readonly actionLabel: string;
  /** Where the action goes. */
  readonly href: typeof ONBOARDING_SETUP_HREF | '/connections';
};

/** The one line and the action for each state that can't start a tree yet. */
export const setupHintCopy = (status: SetupStatus): SetupHintCopy | null => {
  switch (status) {
    case 'first-run':
    case 'no-agent':
      return {
        message: 'Choose a model to start your first tree.',
        actionLabel: 'Set up',
        href: ONBOARDING_SETUP_HREF,
      };
    case 'no-key':
      return {
        message: 'Add your OpenRouter key to start a tree.',
        actionLabel: 'Add key',
        href: '/connections',
      };
    default:
      return null;
  }
};
