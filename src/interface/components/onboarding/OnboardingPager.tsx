import { Children, type ReactNode, type RefObject } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

type OnboardingPagerProps = {
  readonly pagerRef: RefObject<ScrollView | null>;
  readonly pageWidth: number;
  readonly onLayout: (event: LayoutChangeEvent) => void;
  readonly onPageSettled: (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => void;
  /** One child per page; each is centered in a 400 pt tall page. */
  readonly children: ReactNode;
};

/**
 * Latent Spaces' `TabView` in `.page(indexDisplayMode: .never)` with
 * `.frame(maxHeight: 400)` (LoomOnboarding.swift:27-106): pages you swipe
 * between, no dots.
 */
export const OnboardingPager = ({
  pagerRef,
  pageWidth,
  onLayout,
  onPageSettled,
  children,
}: OnboardingPagerProps) => (
  <ScrollView
    ref={pagerRef}
    testID="onboarding-pager"
    horizontal
    pagingEnabled
    showsHorizontalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    onLayout={onLayout}
    onMomentumScrollEnd={onPageSettled}
    style={styles.pager}
  >
    {pageWidth > 0
      ? Children.map(children, (page, index) => (
          <View
            testID={`onboarding-page-${index + 1}`}
            style={[styles.page, { width: pageWidth }]}
          >
            {page}
          </View>
        ))
      : null}
  </ScrollView>
);

const styles = StyleSheet.create({
  pager: {
    height: loomUiTokens.onboarding.pagerHeight,
    flexGrow: 0,
  },
  page: {
    height: loomUiTokens.onboarding.pagerHeight,
    justifyContent: 'center',
  },
});
