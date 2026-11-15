import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

/**
 * An intro page's 400 pt box at the top of its page, content centered, as
 * Latent Spaces' `.frame(maxHeight: 400)` TabView lays it out. The rest of
 * the page is the room Latent Spaces' two `Spacer()`s leave empty.
 */
export const OnboardingIntroFrame = ({
  children,
}: {
  readonly children: ReactNode;
}) => <View style={styles.frame}>{children}</View>;

const styles = StyleSheet.create({
  frame: {
    height: loomUiTokens.onboarding.pagerHeight,
    justifyContent: 'center',
  },
});
