import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  FormRow,
  formText,
  useFormColors,
} from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const form = loomUiTokens.settingsForm;

type ModelListRowProps = {
  readonly id: string;
  readonly label: string;
  readonly selected: boolean;
  readonly first: boolean;
  readonly last: boolean;
  readonly onSelect: (id: string) => void;
};

/**
 * One row of a `.navigationLink` Picker's list: the model's name, a check on
 * the chosen one, in a card cut into rows (first and last round its corners).
 */
export const ModelListRow = memo(function ModelListRow({
  id,
  label,
  selected,
  first,
  last,
  onSelect,
}: ModelListRowProps) {
  const colors = useFormColors();
  return (
    <View
      style={[
        { backgroundColor: colors.card },
        first ? styles.first : null,
        last ? styles.last : null,
      ]}
    >
      <FormRow
        testID={`tree-model-option-${id}`}
        onPress={() => onSelect(id)}
        accessibilityLabel={label}
        style={styles.row}
      >
        <Text numberOfLines={1} style={[formText.body, styles.label]}>
          {label}
        </Text>
        {selected ? (
          <Ionicons
            name="checkmark"
            size={22}
            color={loomUiTokens.colors.accentColor}
          />
        ) : null}
      </FormRow>
      {last ? null : (
        <View
          style={[styles.separator, { backgroundColor: colors.separator }]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  first: {
    borderTopLeftRadius: form.cardRadius,
    borderTopRightRadius: form.cardRadius,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  last: {
    borderBottomLeftRadius: form.cardRadius,
    borderBottomRightRadius: form.cardRadius,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    justifyContent: 'space-between',
  },
  label: {
    flexShrink: 1,
  },
  separator: {
    height: 1,
    marginHorizontal: form.rowPaddingHorizontal,
  },
});
