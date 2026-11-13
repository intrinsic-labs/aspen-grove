import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  FormSection,
  FormSheetHeader,
  FormTextFieldRow,
  formText,
  useFormColors,
} from '@/interface/ui/components/form';
import { AppScreen } from '@/interface/ui/value-objects';
import { agentEditorRoutes } from './agent-editor-routes';
import { useAgentEditor } from './agent-editor-context';
import { AgentModelSection } from './AgentModelSection';
import { GenerationSections } from './GenerationSections';
import { TemplateSection } from './TemplateSection';

/**
 * The agent editor's Form, the sheet's first page, as Latent Spaces
 * presents a Form in a sheet (APIKeySettingsView.swift:106-131): Cancel and
 * Create or Save in the bar, the error pinned under it. Templates (when
 * creating), the name, Provider and Model (Model pushes the model browser),
 * then the generation settings.
 */
export const AgentEditorScreen = () => {
  const { agentId } = useLocalSearchParams<{ agentId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useFormColors();
  const editor = useAgentEditor();
  const { draft, patchDraft, load } = editor;

  // The agent the sheet opened on (none: a new one).
  useEffect(() => {
    void load(agentId);
  }, [agentId, load]);

  const creating = !agentId;
  const onSave = () =>
    void editor.save().then((saved) => saved && router.back());

  return (
    <AppScreen
      testID="agent-editor-sheet"
      style={[styles.screen, { backgroundColor: colors.page }]}
    >
      <FormSheetHeader
        title={creating ? 'New Agent' : 'Edit Agent'}
        leading={{
          label: 'Cancel',
          onPress: () => router.back(),
          disabled: editor.saving,
          testID: 'agent-editor-cancel',
        }}
        trailing={{
          label: creating ? 'Create' : 'Save',
          onPress: onSave,
          busy: editor.saving,
          disabled: !editor.loaded,
          testID: 'agent-editor-submit',
        }}
      />
      {editor.error ? (
        <View style={styles.errorBar}>
          <Text
            testID="agent-editor-error"
            accessibilityRole="alert"
            style={[formText.footer, styles.errorText]}
          >
            {editor.error}
          </Text>
        </View>
      ) : null}

      {editor.loaded ? (
        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 35 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {creating ? (
            <TemplateSection
              selectedKey={editor.templateKey}
              onSelect={editor.applyTemplate}
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

          <AgentModelSection
            draft={draft}
            onChange={patchDraft}
            onOpenModelBrowser={() => router.push(agentEditorRoutes.models())}
          />

          <GenerationSections draft={draft} onChange={patchDraft} />
        </KeyboardAwareScrollView>
      ) : (
        <ActivityIndicator style={styles.loading} />
      )}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  loading: {
    marginTop: 40,
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
