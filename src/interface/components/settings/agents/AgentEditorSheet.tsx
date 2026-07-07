import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';
import { AgentConfigFields } from './AgentConfigFields';
import { ModelPickerField } from './ModelPickerField';
import { AGENT_TEMPLATES } from './agent-templates';
import { validateAgentDraft, type AgentDraft } from './agent-editor-types';

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
 * Modal editor for a model Agent, used for both "+ New Agent" and editing an
 * existing one from the Settings → Agents library.
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
  const { colors } = useAspenGroveTheme();
  const [draft, setDraft] = useState<AgentDraft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form whenever the sheet is (re)opened for a new target.
  useEffect(() => {
    if (visible) {
      setDraft(initialDraft);
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View
        style={[styles.container, { backgroundColor: colors.oppositePrimary }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          <Pressable onPress={onCancel} hitSlop={8} disabled={saving}>
            <AppText variant="meta" tone="secondary">
              Cancel
            </AppText>
          </Pressable>
          <AppText variant="mono" style={styles.headerTitle}>
            {title}
          </AppText>
          <Pressable onPress={onSave} hitSlop={8} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <AppText variant="meta" style={{ color: colors.primary }}>
                {submitLabel}
              </AppText>
            )}
          </Pressable>
        </View>

        <KeyboardAwareScrollView
          enabled
          extraKeyboardSpace={0}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {showTemplates ? (
            <View style={styles.templatesBlock}>
              <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
                START FROM A TEMPLATE
              </AppText>
              <View style={styles.templatesRow}>
                {AGENT_TEMPLATES.map((template) => (
                  <Pressable
                    key={template.key}
                    onPress={() => {
                      setDraft(template.draft);
                      setError(null);
                    }}
                    style={({ pressed }) => [
                      styles.templateChip,
                      { borderColor: colors.line, opacity: pressed ? 0.65 : 1 },
                    ]}
                  >
                    <AppText variant="meta">{template.label}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {allowModelChange ? (
            <View style={styles.block}>
              <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
                MODEL
              </AppText>
              <ModelPickerField
                provider={draft.provider}
                onChangeProvider={(provider) => patchDraft({ provider })}
                modelIdentifier={draft.modelIdentifier}
                onChangeModelIdentifier={(modelIdentifier) =>
                  patchDraft({ modelIdentifier })
                }
                colors={colors}
              />
            </View>
          ) : (
            <View style={styles.block}>
              <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
                MODEL
              </AppText>
              <AppText variant="meta">
                {draft.provider}:{draft.modelIdentifier}
              </AppText>
            </View>
          )}

          <View style={styles.block}>
            <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
              CONFIGURATION
            </AppText>
            <AgentConfigFields
              name={draft.name}
              onChangeName={(name) => patchDraft({ name })}
              temperatureInput={draft.temperatureInput}
              onChangeTemperatureInput={(temperatureInput) =>
                patchDraft({ temperatureInput })
              }
              maxTokensInput={draft.maxTokensInput}
              onChangeMaxTokensInput={(maxTokensInput) =>
                patchDraft({ maxTokensInput })
              }
              systemPrompt={draft.systemPrompt}
              onChangeSystemPrompt={(systemPrompt) =>
                patchDraft({ systemPrompt })
              }
            />
          </View>

          {error ? (
            <AppText variant="meta" tone="accent" style={styles.errorText}>
              {error}
            </AppText>
          ) : null}
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 22,
  },
  templatesBlock: {
    gap: 8,
  },
  templatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
  },
  block: {
    gap: 8,
  },
  blockLabel: {
    fontSize: 11,
    letterSpacing: 0.7,
  },
  errorText: {
    marginTop: 4,
  },
});
