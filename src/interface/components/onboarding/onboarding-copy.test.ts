import { ONBOARDING_INTRO_PAGES } from './intro/onboarding-pages';
import { TREE_ONBOARDING_ITEMS } from './tree/tree-onboarding-items';

/** Every word onboarding shows, links included. */
const onboardingCopy = (): string[] => [
  ...ONBOARDING_INTRO_PAGES.flatMap((page) =>
    page.kind === 'photo'
      ? [page.text]
      : page.items.flatMap((item) => [
          item.text,
          ...(item.link ? [item.link.title, item.link.url] : []),
        ])
  ),
  ...TREE_ONBOARDING_ITEMS.map((item) => item.text),
];

describe('onboarding copy', () => {
  it.each(['Latent Spaces', 'Loom app', 'Anthropic', 'Discord', 'sync'])(
    'never mentions %s',
    (word) => {
      for (const text of onboardingCopy()) {
        expect(text.toLowerCase()).not.toContain(word.toLowerCase());
      }
    }
  );

  it('names Aspen Grove', () => {
    expect(onboardingCopy().join(' ')).toContain('Aspen Grove');
  });
});
