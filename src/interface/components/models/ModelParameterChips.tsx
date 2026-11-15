import { StyleSheet, Text, View } from 'react-native';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const form = loomUiTokens.settingsForm;
const browser = loomUiTokens.modelBrowser;

type ModelParameterChipsProps = {
  readonly parameters: readonly string[];
};

/**
 * The request parameters a model accepts, as OpenRouter lists them: their
 * API names in mono chips, wrapped in one card row.
 */
export const ModelParameterChips = ({
  parameters,
}: ModelParameterChipsProps) => (
  <View testID="model-detail-parameters" style={styles.wrap}>
    {parameters.map((parameter) => (
      <View key={parameter} style={styles.chip}>
        <Text style={styles.text}>{parameter}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: browser.chipGap,
    paddingHorizontal: form.rowPaddingHorizontal,
    paddingVertical: browser.descriptionPadding,
  },
  chip: {
    borderRadius: browser.chipRadius,
    borderCurve: 'continuous',
    backgroundColor: browser.chipBackground,
    paddingHorizontal: browser.chipPaddingHorizontal,
    paddingVertical: browser.chipPaddingVertical,
  },
  text: {
    fontFamily: browser.metaFontFamily,
    fontSize: browser.chipSize,
    lineHeight: browser.metaLineHeight,
    color: '#FFFFFF',
  },
});
