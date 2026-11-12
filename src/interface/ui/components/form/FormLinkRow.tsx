import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text } from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { FormLabel, type FormIconName } from './FormLabel';
import { FormRow } from './FormRow';
import { formText } from './form-text';

const form = loomUiTokens.settingsForm;

type FormLinkRowProps = {
  readonly title: string;
  readonly icon?: FormIconName;
  /** Shown in secondary text before the chevron. */
  readonly value?: string;
  readonly onPress: () => void;
  readonly testID?: string;
};

/** A `NavigationLink` row: label, optional value, trailing chevron. */
export const FormLinkRow = ({
  title,
  icon,
  value,
  onPress,
  testID,
}: FormLinkRowProps) => (
  <FormRow testID={testID} onPress={onPress} accessibilityLabel={title}>
    <FormLabel title={title} icon={icon} />
    {value ? (
      <Text numberOfLines={1} style={[formText.value, styles.value]}>
        {value}
      </Text>
    ) : null}
    <Ionicons
      name="chevron-forward"
      size={form.linkChevronSize}
      color={form.colors.tertiaryLabel}
      style={styles.chevron}
    />
  </FormRow>
);

const styles = StyleSheet.create({
  value: {
    flexShrink: 1,
    maxWidth: '55%',
  },
  chevron: {
    marginRight: 1,
  },
});
