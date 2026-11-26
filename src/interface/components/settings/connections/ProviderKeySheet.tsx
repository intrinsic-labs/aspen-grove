import { useEffect, useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Platform, StyleSheet } from 'react-native';
import {
  FormSection,
  FormSheet,
  FormSheetHeader,
  FormTextFieldRow,
} from '@/interface/ui/components/form';
import { keyStorageCopy } from './key-storage-copy';
import type { ProviderKeyConfig } from './provider-key-config';

type ProviderKeySheetProps = {
  readonly config: ProviderKeyConfig;
  readonly visible: boolean;
  /** The stored key, so Save without typing keeps it. */
  readonly currentKey: string;
  readonly onCancel: () => void;
  /** An empty key removes the stored one. */
  readonly onSave: (key: string) => void;
};

/**
 * Key entry (APIKeySettingsView.swift:106-131): one secure field, Cancel
 * and Save, for any hosted provider. Aspen Grove saves without a biometric
 * prompt, so its footer says only what happens. Ids:
 * `connections-<provider>-key-sheet|-key-input|-key-cancel|-key-save`.
 */
export const ProviderKeySheet = ({
  config,
  visible,
  currentKey,
  onCancel,
  onSave,
}: ProviderKeySheetProps) => {
  const [draft, setDraft] = useState(currentKey);
  const id = `connections-${config.provider}`;

  useEffect(() => {
    if (visible) {
      setDraft(currentKey);
    }
  }, [visible, currentKey]);

  return (
    <FormSheet
      testID={`${id}-key-sheet`}
      visible={visible}
      onRequestClose={onCancel}
      hasUnsavedChanges={draft.trim() !== currentKey.trim()}
    >
      <FormSheetHeader
        title={`${config.name} API Key`}
        leading={{
          label: 'Cancel',
          onPress: onCancel,
          testID: `${id}-key-cancel`,
        }}
        trailing={{
          label: 'Save',
          onPress: () => onSave(draft.trim()),
          testID: `${id}-key-save`,
        }}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <FormSection
          style={styles.firstSection}
          footer={keyStorageCopy(Platform.OS).sheetFooter}
        >
          <FormTextFieldRow
            testID={`${id}-key-input`}
            value={draft}
            onChangeText={setDraft}
            placeholder={config.placeholder}
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
