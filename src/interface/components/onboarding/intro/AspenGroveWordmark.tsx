import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const wordmark = loomUiTokens.onboarding.wordmark;

type LettersProps = {
  readonly word: string;
  readonly gap: number;
  readonly style?: StyleProp<ViewStyle>;
};

const Letters = ({ word, gap, style }: LettersProps) => (
  <View style={[styles.line, { gap }, style]}>
    {Array.from(word).map((letter, index) => (
      <Text key={index} style={styles.letter}>
        {letter}
      </Text>
    ))}
  </View>
);

/**
 * Latent Spaces' letter-spaced title (LatentSpacesTitleView.swift, no
 * tagline): one Cardo 40 Text per letter, the two words on two lines of
 * equal width.
 */
export const AspenGroveWordmark = () => (
  <View
    testID="onboarding-wordmark"
    accessible
    accessibilityRole="header"
    accessibilityLabel="Aspen Grove"
    style={styles.container}
  >
    <Letters word="ASPEN" gap={wordmark.firstLineGap} />
    <Letters
      word="GROVE"
      gap={wordmark.secondLineGap}
      style={styles.secondLine}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: wordmark.padding,
  },
  line: {
    flexDirection: 'row',
  },
  // `VStack(spacing: -6)`: Yoga has no negative gap.
  secondLine: {
    marginTop: wordmark.lineSpacing,
  },
  letter: {
    fontFamily: 'Cardo-Regular',
    fontSize: wordmark.fontSize,
    lineHeight: wordmark.lineHeight,
    color: '#FFFFFF',
  },
});
