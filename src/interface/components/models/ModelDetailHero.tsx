import { StyleSheet, Text, View } from 'react-native';
import { formText } from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const form = loomUiTokens.settingsForm;
const browser = loomUiTokens.modelBrowser;

type ModelDetailHeroProps = {
  readonly title: string;
  readonly author: string;
  readonly id: string;
};

/** The top of a model's page: its name in Cardo, who made it, its id in mono. */
export const ModelDetailHero = ({
  title,
  author,
  id,
}: ModelDetailHeroProps) => (
  <View style={styles.hero}>
    <Text
      testID="model-detail-title"
      accessibilityRole="header"
      style={styles.title}
    >
      {title}
    </Text>
    <Text testID="model-detail-author" style={formText.value}>
      by {author}
    </Text>
    <Text selectable style={styles.id}>
      {id}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: form.rowPaddingHorizontal,
    paddingTop: browser.heroTopGap,
    gap: browser.heroLineGap,
  },
  title: {
    fontFamily: browser.titleFontFamily,
    fontSize: browser.titleSize,
    lineHeight: browser.titleLineHeight,
    color: '#FFFFFF',
  },
  id: {
    fontFamily: browser.metaFontFamily,
    fontSize: browser.metaSize,
    lineHeight: browser.metaLineHeight,
    color: form.colors.secondaryLabel,
  },
});
