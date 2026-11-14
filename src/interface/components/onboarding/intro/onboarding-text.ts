import { StyleSheet } from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const page = loomUiTokens.onboarding.page;

/** Onboarding's one text style: Cardo 18, set on the whole TabView. */
export const onboardingText = StyleSheet.create({
  body: {
    fontFamily: 'Cardo-Regular',
    fontSize: page.fontSize,
    lineHeight: page.lineHeight,
    color: '#FFFFFF',
  },
  link: {
    fontFamily: 'Cardo-Regular',
    fontSize: page.fontSize,
    lineHeight: page.lineHeight,
    color: loomUiTokens.colors.accentColor,
  },
});
