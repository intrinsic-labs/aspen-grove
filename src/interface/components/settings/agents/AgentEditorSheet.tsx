import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FormSection,
  FormSheet,
  FormSheetHeader,
  FormTextFieldRow,
  FormValueRow,
  formText,
} from '@/interface/ui/components/form';
import { validateAgentDraft, type AgentDraft } from './agent-editor-types';
import { GenerationSections } from './editor/GenerationSections';
import { ModelSections } from './editor/ModelSections';
import { TemplateSection } from './editor/TemplateSection';

type AgentEditorSheetProps = {
  readonly visible: boolean;
  readonly title: string;
  readonly initialDraft: AgentDraft;
  /** Show quick-start templates (create mode only). */
  readonly showTemplates?: boolean;
  /** Allow switching provider/model. Defaults to true. */
  readonly allowModelChange?: boolean;
  readonly submitLabel?: string;
  readonly onCancel: () => void;
  /** Throws on failure; the sheet displays the error and stays open. */
  readonly onSubmit: (draft: AgentDraft) => Promise<void>;
};

/**
 * The agent editor, a Form in a sheet the way Latent Spaces presents one
 * (APIKeySettingsView.swift:106-131): Cancel and the submit button in the
 * bar, the error pinned under it so it is in view however far the form is
 * scrolled. Used for "New Agent" and editing a library agent.
 */
export const AgentEditorSheet = ({
  visible,
  title,
  initialDraft,
  showTemplates = false,
  allowModelChange = true,
  submitLabel = 'Save',
  onCancel,
  onSubmit,
}: AgentEditorSheetProps) => {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<AgentDraft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateKey, setTemplateKey] = useState<string | null>(null);

  // Re-seed the form whenever the sheet is (re)opened for a new target.
  useEffect(() => {
    if (visible) {
      setDraft(initialDraft);
      setTemplateKey(null);
      setError(null);
      setSaving(false);
    }
  }, [initialDraft, visible]);

  const patchDraft = (changes: Partial<AgentDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const onSave = async () => {
    const validationError = validateAgentDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit(draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSaving(false);
    }
  };

  return (
    <FormSheet
      testID="agent-editor-sheet"
      visible={visible}
      onRequestClose={onCancel}
    >
      <FormSheetHeader
        title={title}
        leading={{
          label: 'Cancel',
          onPress: onCancel,
          disabled: saving,
          testID: 'agent-editor-cancel',
        }}
        trailing={{
          label: submitLabel,
          onPress: () => void onSave(),
          busy: saving,
          testID: 'agent-editor-submit',
        }}
      />
      {error ? (
        <View style={styles.errorBar}>
          <Text
            testID="agent-editor-error"
            accessibilityRole="alert"
            style={[formText.footer, styles.errorText]}
          >
            {error}
          </Text>
        </View>
      ) : null}

      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 35 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {showTemplates ? (
          <TemplateSection
            selectedKey={templateKey}
            onSelect={(template) => {
              setDraft(template.draft);
              setTemplateKey(template.key);
              setError(null);
            }}
          />
        ) : null}

        <FormSection header="Name">
          <FormTextFieldRow
            testID="agent-editor-name-input"
            value={draft.name}
            onChangeText={(name) => patchDraft({ name })}
            placeholder="e.g. Claude (Creative)"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </FormSection>

        {allowModelChange ? (
          <ModelSections
            provider={draft.provider}
            onChangeProvider={(provider) => patchDraft({ provider })}
            modelIdentifier={draft.modelIdentifier}
            onChangeModelIdentifier={(modelIdentifier) =>
              patchDraft({ modelIdentifier })
            }
            testIDPrefix="agent-editor"
          />
        ) : (
          <FormSection header="Model">
            <FormValueRow
              title={draft.provider === 'lmstudio' ? 'LM Studio' : 'OpenRouter'}
              value={draft.modelIdentifier}
            />
          </FormSection>
        )}

        <GenerationSections draft={draft} onChange={patchDraft} />
      </KeyboardAwareScrollView>
    </FormSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
  },
  errorBar: {
    paddingHorizontal: 32,
    paddingTop: 12,
  },
  errorText: {
    // systemRed, dark
    color: '#FF453A',
  },
});
