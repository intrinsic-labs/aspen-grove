import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { FormRow, formText } from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const form = loomUiTokens.settingsForm;

type ModelSearchRowProps = {
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder: string;
  readonly loading: boolean;
  readonly onRefresh: () => void;
  readonly testIDPrefix: string;
};

/** A search field row with the list's refresh button. */
export const ModelSearchRow = ({
  value,
  onChangeText,
  placeholder,
  loading,
  onRefresh,
  testIDPrefix,
}: ModelSearchRowProps) => (
  <FormRow>
    <Ionicons name="search" size={17} color={form.colors.secondaryLabel} />
    <TextInput
      testID={`${testIDPrefix}-model-search-input`}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={form.colors.tertiaryLabel}
      selectionColor={loomUiTokens.colors.accentColor}
      keyboardAppearance="dark"
      autoCapitalize="none"
      autoCorrect={false}
      style={[formText.body, styles.field]}
    />
    <Pressable
      testID={`${testIDPrefix}-model-refresh`}
      onPress={onRefresh}
      disabled={loading}
      accessibilityLabel="Refresh models"
      hitSlop={8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={form.colors.secondaryLabel} />
      ) : (
        <Ionicons
          name="refresh"
          size={20}
          color={loomUiTokens.colors.accentColor}
        />
      )}
    </Pressable>
  </FormRow>
);

const styles = StyleSheet.create({
  field: {
    flex: 1,
    paddingVertical: 15,
  },
});
