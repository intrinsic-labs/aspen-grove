import { StyleSheet, Text } from 'react-native';
import { FormLabel, FormRow, formText } from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const browser = loomUiTokens.modelBrowser;

type ModelInfoRowProps = {
  readonly title: string;
  readonly value: string;
  /** Lands on the value's Text, so a driver can read it. */
  readonly testID?: string;
};

/** A labelled figure on a model's page: the label, then the value in mono. */
export const ModelInfoRow = ({ title, value, testID }: ModelInfoRowProps) => (
  <FormRow>
    <FormLabel title={title} />
    <Text
      testID={testID}
      selectable
      numberOfLines={2}
      style={[formText.value, styles.value]}
    >
      {value}
    </Text>
  </FormRow>
);

const styles = StyleSheet.create({
  value: {
    flexShrink: 1,
    marginLeft: 'auto',
    textAlign: 'right',
    fontFamily: browser.metaFontFamily,
    fontSize: browser.valueSize,
  },
});
