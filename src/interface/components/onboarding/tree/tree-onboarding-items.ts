import type { OnboardingSymbol } from '../intro/OnboardingIcon';

type TreeOnboardingItem = {
  readonly icon: OnboardingSymbol;
  readonly text: string;
};

/** LoomTreeOnboarding.swift:35-39, word for word but a spelling fix. */
export const TREE_ONBOARDING_ITEMS: readonly TreeOnboardingItem[] = [
  {
    icon: 'bubble.left.and.text.bubble.right',
    text: 'Messages are called nodes. Long press any node to view context menu options.',
  },
  {
    icon: 'checkmark.circle',
    text: 'When viewing continuations, a green check appears for nodes on the current branch.',
  },
  {
    icon: 'text.append',
    text: 'Continuations also display the number of on-branch nodes they precede in square brackets: [3]',
  },
];
