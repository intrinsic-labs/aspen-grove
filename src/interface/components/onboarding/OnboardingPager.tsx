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
  readonly pageHeight: number;
  readonly onLayout: (event: LayoutChangeEvent) => void;
  readonly onPageSettled: (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => void;
  /** One child per page, each as large as the pager. */
  readonly children: ReactNode;
};

/**
 * Latent Spaces' `TabView` in `.page(indexDisplayMode: .never)`
 * (LoomOnboarding.swift:27-106): pages you swipe between, no dots. Latent
 * Spaces caps it at 400 pt with `Spacer()` twice under it; this pager takes
 * that 400 pt plus the two spacers' share (`flexBasis` 400, `flexGrow` 2
 * against the one `Spacer()` above the wordmark), so the intro pages sit
 * exactly where Latent Spaces puts them (`OnboardingIntroFrame`) and the
 * setup page can use the whole height down to the button.
 */
export const OnboardingPager = ({
  pagerRef,
  pageWidth,
  pageHeight,
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
            style={{ width: pageWidth, height: pageHeight }}
          >
            {page}
          </View>
        ))
      : null}
  </ScrollView>
);

const styles = StyleSheet.create({
  pager: {
    flexBasis: loomUiTokens.onboarding.pagerHeight,
    flexGrow: 2,
    flexShrink: 0,
    // The second `Spacer()`'s share of the stack spacing.
    marginBottom: loomUiTokens.onboarding.stackSpacing,
  },
});
