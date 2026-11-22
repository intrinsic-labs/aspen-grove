import type { ComponentProps } from 'react';
import type { FormIconName } from '@/interface/ui/components/form/FormLabel';
import type { SymbolIcon } from '@/interface/ui/components/SymbolIcon';
import { HOME_LINKS } from '../../home/home-links';

type AppInfoLink = {
  /** Suffix of the row's testID: `settings-app-info-<slug>`. */
  readonly slug: string;
  readonly title: string;
  readonly url: string;
  readonly systemIcon: ComponentProps<typeof SymbolIcon>['name'];
  /** The Android/web glyph, where SF Symbols don't exist. */
  readonly icon: FormIconName;
};

/** The links under "App Info" (LoomSettingsView.swift:329-351), in order. */
export const APP_INFO_LINKS: readonly AppInfoLink[] = [
  {
    slug: 'intrinsic-labs',
    title: 'Created by Intrinsic Labs',
    url: 'https://intrinsiclabs.co',
    systemIcon: 'heart',
    icon: 'heart-outline',
  },
  {
    slug: 'open-loom',
    title: 'Open Loom Specification',
    url: HOME_LINKS.openLoomDocs,
    systemIcon: 'book',
    icon: 'book-outline',
  },
  {
    slug: 'github',
    title: 'Aspen Grove on GitHub',
    url: 'https://github.com/intrinsic-labs/aspen-grove',
    systemIcon: 'chevron.left.forwardslash.chevron.right',
    icon: 'code-slash-outline',
  },
  {
    slug: 'clooi',
    title: 'Inspired by socketteer/clooi',
    url: 'https://github.com/socketteer/clooi',
    systemIcon: 'lightbulb',
    icon: 'bulb-outline',
  },
];
