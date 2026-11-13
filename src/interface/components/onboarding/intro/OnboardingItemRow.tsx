import { StyleSheet, Text, View } from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { OnboardingIcon, type OnboardingSymbol } from './OnboardingIcon';
import { onboardingText } from './onboarding-text';

const item = loomUiTokens.onboarding.item;

type OnboardingItemRowProps = {
  readonly icon: OnboardingSymbol;
  readonly text: string;
};

/**
 * Latent Spaces' `OnboardingItem` (LoomOnboarding.swift:139-174), the
 * horizontal kind: a gold symbol in a 50 pt column, then Cardo text.
 */
export const OnboardingItemRow = ({ icon, text }: OnboardingItemRowProps) => (
  <View style={styles.row}>
    <View style={styles.iconColumn}>
      <OnboardingIcon name={icon} />
    </View>
    <Text style={[onboardingText.body, styles.text]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: item.textGap,
  },
  // The symbol plus its trailing padding, centered in the 50 pt frame: the
  // glyph's center lands 17 pt into the column.
  iconColumn: {
    width: item.iconColumn,
    alignItems: 'center',
    paddingRight: item.iconTrailingPadding,
  },
  // The trailing `Spacer` keeps at least 8 pt after the text.
  text: {
    flex: 1,
    marginRight: item.textGap,
  },
});
