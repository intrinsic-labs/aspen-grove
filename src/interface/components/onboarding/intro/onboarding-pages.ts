import type { ImageSourcePropType } from 'react-native';
import { HOME_LINKS } from '../../home/home-links';
import type { OnboardingSymbol } from './OnboardingIcon';

export type OnboardingLink = {
  readonly title: string;
  readonly url: string;
  /** A leading symbol, as a SwiftUI `Label`. */
  readonly icon?: OnboardingSymbol;
  readonly testID: string;
};

export type OnboardingItem = {
  readonly text: string;
  readonly icon: OnboardingSymbol;
  /** A link centered under the item. */
  readonly link?: OnboardingLink;
};

export type OnboardingIntroPage =
  | {
      readonly kind: 'photo';
      readonly image: ImageSourcePropType;
      /**
       * Latent Spaces sizes each photo by width only (`.frame(width: 180)`
       * on a `.fill` image), so its frame runs taller than the 180 pt circle
       * clipped into it, by an amount that differs per photo. Measured on
       * the reference shots 50-52.
       */
      readonly imageFrameHeight: number;
      readonly text: string;
    }
  | {
      readonly kind: 'items';
      readonly items: readonly OnboardingItem[];
      /** Page 6 stacks its items and links closer (`spacing: 15`). */
      readonly compact?: boolean;
    };

const ISSUES_URL = 'https://github.com/intrinsic-labs/aspen-grove/issues';

/**
 * Latent Spaces' onboarding pages (LoomOnboarding.swift:27-100), in its
 * order, with its words where they are true of Aspen Grove. The page that
 * connects a model follows these (see `setup/`).
 */
export const ONBOARDING_INTRO_PAGES: readonly OnboardingIntroPage[] = [
  {
    kind: 'photo',
    image: require('../../../../../assets/images/onboarding/xray.jpg'),
    imageFrameHeight: 206,
    text: 'Aspen Grove is a loom interface; a tool for human/AI interaction. Unlike standard back-and-forth messaging apps, looms let you explore multiple continuations of any prompt at once, opening a door to explore the textual multiverse.',
  },
  {
    kind: 'photo',
    image: require('../../../../../assets/images/onboarding/fireworks.jpg'),
    imageFrameHeight: 232,
    text: "The term 'loom' originates from the Loom of Time theory, which visualizes reality as a vast tapestry of infinite potentials. A weaver may choose to follow one thread, or many, or none, all by learning to work the Loom.",
  },
  {
    kind: 'photo',
    image: require('../../../../../assets/images/onboarding/planets.jpg'),
    imageFrameHeight: 258,
    text: 'Aspen Grove is a loom interface natively designed for mobile, giving you unprecedented power to delve into the depths of language models right from your pocket.',
  },
  {
    kind: 'items',
    items: [
      {
        icon: 'text.append',
        text: 'Conversations are called Loom Trees. Generate multiple continuations to any prompt. Continue the exchange from any or all of them.',
      },
      {
        icon: 'point.bottomleft.forward.to.point.topright.filled.scurvepath',
        text: 'Traverse the branches of the tree at will. Try different prompts, settings, and models to take branches in varying directions.',
      },
    ],
  },
  {
    kind: 'items',
    items: [
      {
        icon: 'key',
        text: 'Connect your own OpenRouter key, or LM Studio on your computer, to start talking to models. Keys stay on this device.',
      },
      {
        icon: 'tree',
        text: 'Import and export Loom Trees using the OpenLoom format.',
        link: {
          title: 'OpenLoom Documentation',
          url: HOME_LINKS.openLoomDocs,
          icon: 'book',
          testID: 'onboarding-link-openloom',
        },
      },
    ],
  },
  {
    kind: 'items',
    compact: true,
    items: [
      {
        icon: 'info.circle',
        text: 'Visit the Aspen Grove project page for help and more information.',
        link: {
          title: 'Visit the Project Page',
          url: HOME_LINKS.infoAndTutorials,
          testID: 'onboarding-link-project',
        },
      },
      {
        icon: 'bubble.left.and.text.bubble.right',
        text: 'Aspen Grove is open source. Report a bug or suggest a feature on GitHub.',
        link: {
          title: 'Open an Issue',
          url: ISSUES_URL,
          testID: 'onboarding-link-issues',
        },
      },
    ],
  },
];
