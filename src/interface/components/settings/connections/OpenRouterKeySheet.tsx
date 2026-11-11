import { useEffect, useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { StyleSheet } from 'react-native';
import {
  FormSection,
  FormSheet,
  FormSheetHeader,
  FormTextFieldRow,
} from '@/interface/ui/components/form';

type OpenRouterKeySheetProps = {
  readonly visible: boolean;
  /** The stored key, so Save without typing keeps it. */
  readonly currentKey: string;
  readonly onCancel: () => void;
  /** An empty key removes the stored one. */
  readonly onSave: (key: string) => void;
};

/**
 * Key entry (APIKeySettingsView.swift:106-131): one secure field, Cancel
 * and Save. Aspen Grove saves without a biometric prompt, so its footer
 * says only what happens.
 */
export const OpenRouterKeySheet = ({
  visible,
  currentKey,
  onCancel,
  onSave,
}: OpenRouterKeySheetProps) => {
  const [draft, setDraft] = useState(currentKey);

  useEffect(() => {
    if (visible) {
      setDraft(currentKey);
    }
  }, [visible, currentKey]);

  return (
    <FormSheet
      testID="connections-openrouter-key-sheet"
      visible={visible}
      onRequestClose={onCancel}
    >
      <FormSheetHeader
        title="OpenRouter API Key"
        leading={{
          label: 'Cancel',
          onPress: onCancel,
          testID: 'connections-openrouter-key-cancel',
        }}
        trailing={{
          label: 'Save',
          onPress: () => onSave(draft.trim()),
          testID: 'connections-openrouter-key-save',
        }}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <FormSection
          style={styles.firstSection}
          footer="Your API key will be stored in the iOS Keychain on this device. Save an empty field to remove it."
        >
          <FormTextFieldRow
            testID="connections-openrouter-key-input"
            value={draft}
            onChangeText={setDraft}
            placeholder="Enter Key"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </FormSection>
      </KeyboardAwareScrollView>
    </FormSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
  },
  // Field row top 167 pt in a sheet whose top is 62 pt, below a 61 pt bar
  // (measured).
  firstSection: {
    marginTop: 44,
  },
});
