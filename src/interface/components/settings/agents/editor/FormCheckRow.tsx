import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FormRow, formText } from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

type FormCheckRowProps = {
  readonly title: string;
  /** A caption line under the title. */
  readonly detail?: string;
  /** Drawn after the title, e.g. a loaded-model glyph. */
  readonly badge?: ReactNode;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly testID?: string;
};

/**
 * One choice of an inline Form Picker: title (and caption) on the left, the
 * accent checkmark in its own trailing column, so it lines up on every row
 * whatever the text length.
 */
export const FormCheckRow = ({
  title,
  detail,
  badge,
  selected,
  onPress,
  testID,
}: FormCheckRowProps) => (
  <FormRow
    testID={testID}
    onPress={onPress}
    accessibilityLabel={title}
    style={detail ? styles.tallRow : null}
  >
    <View style={styles.text}>
      <View style={styles.titleLine}>
        <Text numberOfLines={1} style={[formText.body, styles.title]}>
          {title}
        </Text>
        {badge}
      </View>
      {detail ? (
        <Text numberOfLines={1} style={formText.footer}>
          {detail}
        </Text>
      ) : null}
    </View>
    <View style={styles.check}>
      {selected ? (
        <Ionicons
          name="checkmark"
          size={20}
          color={loomUiTokens.colors.accentColor}
        />
      ) : null}
    </View>
  </FormRow>
);

const styles = StyleSheet.create({
  tallRow: {
    paddingVertical: 10,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
  },
  check: {
    width: 22,
    alignItems: 'flex-end',
  },
});
