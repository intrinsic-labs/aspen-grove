import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import ContextMenu from 'react-native-context-menu-view';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { FormLabel } from './FormLabel';
import { FormRow } from './FormRow';
import { formText } from './form-text';

const form = loomUiTokens.settingsForm;

export type FormPickerOption<T> = {
  readonly value: T;
  /** The menu item's title, and the row's value while it is selected. */
  readonly label: string;
};

type FormPickerRowProps<T> = {
  readonly title: string;
  readonly value: T;
  readonly options: readonly FormPickerOption<T>[];
  readonly onChange: (value: T) => void;
  /** Forwarded to the row; the menu items are native and have no id. */
  readonly testID?: string;
};

/**
 * A SwiftUI menu `Picker` in a Form: title, the selected value and
 * `chevron.up.chevron.down`; a tap opens a native pull-down menu with a
 * check on the selected item.
 */
export const FormPickerRow = <T,>({
  title,
  value,
  options,
  onChange,
  testID,
}: FormPickerRowProps<T>) => {
  const selected = options.find((option) => option.value === value);

  return (
    <ContextMenu
      dropdownMenuMode
      actions={options.map((option) => ({
        title: option.label,
        selected: option.value === value,
      }))}
      onPress={(event) => {
        const picked = options[event.nativeEvent.index];
        if (picked && picked.value !== value) {
          onChange(picked.value);
        }
      }}
    >
      <FormRow testID={testID}>
        <FormLabel title={title} />
        <View style={styles.trailing}>
          <Text numberOfLines={1} style={formText.value}>
            {selected?.label ?? ''}
          </Text>
          <Ionicons
            name="chevron-expand"
            size={form.pickerChevronSize}
            color={form.colors.secondaryLabel}
          />
        </View>
      </FormRow>
    </ContextMenu>
  );
};

const styles = StyleSheet.create({
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
});
