import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { AspenGroveWordmark } from './intro/AspenGroveWordmark';
import { OnboardingIntroFrame } from './intro/OnboardingIntroFrame';
import { ONBOARDING_INTRO_PAGES } from './intro/onboarding-pages';
import { OnboardingItemsPage } from './intro/OnboardingItemsPage';
import { OnboardingPhotoPage } from './intro/OnboardingPhotoPage';
import { OnboardingButton } from './OnboardingButton';
import { OnboardingPager } from './OnboardingPager';
import { OnboardingSetupPage } from './setup/OnboardingSetupPage';
import { useFinishOnboarding } from './setup/useFinishOnboarding';
import { useOnboardingSetup } from './setup/useOnboardingSetup';
import { useOnboardingPager } from './useOnboardingPager';

const PAGE_COUNT = ONBOARDING_INTRO_PAGES.length + 1;

/**
 * Latent Spaces' first-launch sheet (LoomOnboarding.swift): the wordmark,
 * pages you swipe or step through with Next, and Begin Weaving on the last.
 * Aspen Grove's last page connects a model, so Begin Weaving can open a
 * first tree that answers. Opened with `?start=setup`, it opens on that
 * page.
 */
const OnboardingView = () => {
  const insets = useSafeAreaInsets();
  const { start } = useLocalSearchParams<{ start?: string }>();
  const pager = useOnboardingPager(
    PAGE_COUNT,
    start === 'setup' ? PAGE_COUNT - 1 : 0
  );
  const setup = useOnboardingSetup();
  const finish = useFinishOnboarding(setup);

  return (
    <View testID="onboarding-screen" style={styles.sheet}>
      <View style={styles.spacer} />
      <AspenGroveWordmark />
      <OnboardingPager
        pagerRef={pager.pagerRef}
        pageWidth={pager.pageWidth}
        pageHeight={pager.pageHeight}
        onLayout={pager.onLayout}
        onPageSettled={pager.onPageSettled}
      >
        {ONBOARDING_INTRO_PAGES.map((page, index) => (
          <OnboardingIntroFrame key={index}>
            {page.kind === 'photo' ? (
              <OnboardingPhotoPage
                image={page.image}
                imageFrameHeight={page.imageFrameHeight}
                text={page.text}
              />
            ) : (
              <OnboardingItemsPage items={page.items} compact={page.compact} />
            )}
          </OnboardingIntroFrame>
        ))}
        <OnboardingSetupPage setup={setup} error={finish.error} />
      </OnboardingPager>
      <View style={{ paddingBottom: insets.bottom }}>
        {pager.isLastPage ? (
          <OnboardingButton
            testID="onboarding-begin"
            label="Begin Weaving"
            prominent
            busy={finish.busy}
            onPress={() => void finish.finish()}
          />
        ) : (
          <OnboardingButton
            testID="onboarding-next"
            label="Next"
            prominent={false}
            onPress={pager.next}
          />
        )}
      </View>
    </View>
  );
};

export default OnboardingView;

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: loomUiTokens.onboarding.background,
    gap: loomUiTokens.onboarding.stackSpacing,
  },
  spacer: {
    flex: 1,
  },
});
