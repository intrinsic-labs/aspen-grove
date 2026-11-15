import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { OnboardingIcon } from './OnboardingIcon';
import type { OnboardingLink } from './onboarding-pages';
import { onboardingText } from './onboarding-text';

type OnboardingLinkButtonProps = {
  readonly link: OnboardingLink;
};

/** A SwiftUI `Link` on an onboarding page: accent Cardo, centered. */
export const OnboardingLinkButton = ({ link }: OnboardingLinkButtonProps) => (
  <Pressable
    testID={link.testID}
    accessibilityRole="link"
    accessibilityLabel={link.title}
    onPress={() => void Linking.openURL(link.url)}
    hitSlop={8}
    style={({ pressed }) => [styles.link, { opacity: pressed ? 0.5 : 1 }]}
  >
    {link.icon ? <OnboardingIcon name={link.icon} /> : null}
    <Text style={onboardingText.link}>{link.title}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: loomUiTokens.onboarding.linkIconGap,
  },
});
