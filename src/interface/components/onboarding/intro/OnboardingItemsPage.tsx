import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import type { OnboardingItem } from './onboarding-pages';
import { OnboardingItemRow } from './OnboardingItemRow';
import { OnboardingLinkButton } from './OnboardingLinkButton';

const page = loomUiTokens.onboarding.page;

type OnboardingItemsPageProps = {
  readonly items: readonly OnboardingItem[];
  readonly compact?: boolean;
};

/**
 * Pages 4-6 (LoomOnboarding.swift:63-100): gold symbol rows, each with an
 * optional link under it. Page 5's link tucks 15 pt up under its item; page
 * 6 is the compact one, its links 15 pt clear of what follows.
 */
export const OnboardingItemsPage = ({
  items,
  compact = false,
}: OnboardingItemsPageProps) => (
  <View
    style={[
      styles.page,
      { gap: compact ? page.linkPageItemGap : page.itemGap },
    ]}
  >
    {items.map((item, index) => (
      <Fragment key={index}>
        <OnboardingItemRow icon={item.icon} text={item.text} />
        {item.link ? (
          <View
            style={
              compact
                ? index < items.length - 1
                  ? styles.compactLink
                  : null
                : styles.tuckedLink
            }
          >
            <OnboardingLinkButton link={item.link} />
          </View>
        ) : null}
      </Fragment>
    ))}
  </View>
);

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: page.paddingHorizontal,
  },
  tuckedLink: {
    marginTop: page.docsLinkTopOffset,
  },
  compactLink: {
    marginBottom: page.linkBottomGap,
  },
});
