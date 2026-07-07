import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ULID } from '@domain/value-objects';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppInput, AppText } from '@/interface/ui/value-objects';
import { AgentConfigFields } from '../../settings/agents/AgentConfigFields';
import { ModelPickerField } from '../../settings/agents/ModelPickerField';
import {
  validateAgentDraft,
  type AgentDraft,
} from '../../settings/agents/agent-editor-types';
import { draftFromAgent } from '../../settings/agents/useAgentsLibraryController';
import { useDialogueSettingsController } from './useDialogueSettingsController';

type DialogueSettingsSheetProps = {
  readonly visible: boolean;
  readonly treeId: ULID | null;
  readonly onClose: () => void;
  readonly onSessionInvalidated: () => void | Promise<void>;
};

/**
 * The chat ⚙️ sheet: this tree's agent and system context, without leaving
 * the conversation. Editing a shared agent goes through an explicit
 * shared-vs-fork choice; tree-owned agents are edited directly.
 */
export const DialogueSettingsSheet = ({
  visible,
  treeId,
  onClose,
  onSessionInvalidated,
}: DialogueSettingsSheetProps) => {
  const { colors } = useAspenGroveTheme();
  const controller = useDialogueSettingsController({
    treeId,
    visible,
    onSessionInvalidated,
  });

  const [editDraft, setEditDraft] = useState<AgentDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Seed the edit form whenever edit mode is entered for the current agent.
  useEffect(() => {
    if (controller.mode === 'editAgent' && controller.agent) {
      setEditDraft(draftFromAgent(controller.agent));
      setEditError(null);
      setEditSaving(false);
    }
  }, [controller.agent, controller.mode]);

  const patchEditDraft = (changes: Partial<AgentDraft>) =>
    setEditDraft((current) => (current ? { ...current, ...changes } : current));

  const onSaveAgentEdit = async () => {
    if (!editDraft) {
      return;
    }
    const validationError = validateAgentDraft(editDraft);
    if (validationError) {
      setEditError(validationError);
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await controller.submitAgentEdit(editDraft);
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : String(caught));
      setEditSaving(false);
    }
  };

  const renderOverview = () => (
    <>
      <View style={styles.block}>
        <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
          AGENT
        </AppText>
        {controller.agent ? (
          <View style={[styles.agentCard, { borderColor: colors.line }]}>
            <AppText variant="body" style={styles.agentName}>
              {controller.agent.name}
            </AppText>
            <AppText
              variant="meta"
              style={{ color: colors.secondary, marginTop: 2 }}
            >
              {controller.agent.modelRef}
            </AppText>
            <AppText
              variant="meta"
              style={{ color: colors.secondary, marginTop: 6 }}
            >
              {controller.isTreeOwned
                ? 'Private to this conversation'
                : `Shared agent · used by ${controller.referencingTreeCount} ${
                    controller.referencingTreeCount === 1 ? 'tree' : 'trees'
                  }`}
            </AppText>

            <View style={styles.actionRow}>
              <Pressable
                onPress={controller.onEditAgent}
                disabled={controller.busy}
                style={({ pressed }) => [
                  styles.actionButton,
                  { borderColor: colors.primary, opacity: pressed ? 0.65 : 1 },
                ]}
              >
                <AppText variant="meta" style={{ color: colors.primary }}>
                  Edit agent
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => controller.setMode('switchAgent')}
                disabled={controller.busy}
                style={({ pressed }) => [
                  styles.actionButton,
                  { borderColor: colors.line, opacity: pressed ? 0.65 : 1 },
                ]}
              >
                <AppText variant="meta" style={{ color: colors.secondary }}>
                  Switch agent
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : (
          <AppText variant="meta" tone="accent">
            This tree has no agent configured. Pick one below.
          </AppText>
        )}
      </View>

      <View style={styles.block}>
        <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
          TREE SYSTEM CONTEXT
        </AppText>
        <AppText
          variant="meta"
          style={[styles.helperText, { color: colors.secondary }]}
        >
          Prepended after the agent's system prompt, for this tree only.
        </AppText>
        <AppInput
          value={controller.systemContextInput}
          onChangeText={controller.setSystemContextInput}
          placeholder="e.g. We are exploring recursive self-models…"
          autoCapitalize="sentences"
          multiline
          textAlignVertical="top"
          style={styles.systemContextInput}
        />
        {controller.systemContextDirty ? (
          <Pressable
            onPress={() => void controller.saveSystemContext()}
            disabled={controller.busy}
            style={({ pressed }) => [
              styles.saveContextButton,
              { borderColor: colors.primary, opacity: pressed ? 0.65 : 1 },
            ]}
          >
            {controller.busy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <AppText variant="meta" style={{ color: colors.primary }}>
                Save context
              </AppText>
            )}
          </Pressable>
        ) : null}
      </View>
    </>
  );

  const renderSwitchAgent = () => {
    const currentAgentId = controller.agent?.id;
    const candidates = controller.sharedAgents.filter(
      (candidate) => candidate.id !== currentAgentId
    );

    return (
      <View style={styles.block}>
        <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
          SWITCH AGENT
        </AppText>
        <AppText
          variant="meta"
          style={[styles.helperText, { color: colors.secondary }]}
        >
          Re-points this tree; the conversation history is unchanged.
        </AppText>
        {candidates.length === 0 ? (
          <AppText variant="meta" style={{ color: colors.secondary }}>
            No other shared agents. Create one in Settings → Agents.
          </AppText>
        ) : (
          candidates.map((candidate) => (
            <Pressable
              key={candidate.id}
              onPress={() => void controller.switchToAgent(candidate.id)}
              disabled={controller.busy}
              style={({ pressed }) => [
                styles.agentCard,
                {
                  borderColor: colors.line,
                  opacity: controller.busy ? 0.5 : pressed ? 0.65 : 1,
                },
              ]}
            >
              <AppText variant="body" style={styles.agentName}>
                {candidate.name}
              </AppText>
              <AppText
                variant="meta"
                style={{ color: colors.secondary, marginTop: 2 }}
              >
                {candidate.modelRef}
              </AppText>
            </Pressable>
          ))
        )}
      </View>
    );
  };

  const renderEditAgent = () =>
    editDraft ? (
      <>
        <View style={styles.block}>
          <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
            MODEL
          </AppText>
          <ModelPickerField
            provider={editDraft.provider}
            onChangeProvider={(provider) => patchEditDraft({ provider })}
            modelIdentifier={editDraft.modelIdentifier}
            onChangeModelIdentifier={(modelIdentifier) =>
              patchEditDraft({ modelIdentifier })
            }
            colors={colors}
          />
        </View>

        <View style={styles.block}>
          <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
            CONFIGURATION
          </AppText>
          <AgentConfigFields
            name={editDraft.name}
            onChangeName={(name) => patchEditDraft({ name })}
            temperatureInput={editDraft.temperatureInput}
            onChangeTemperatureInput={(temperatureInput) =>
              patchEditDraft({ temperatureInput })
            }
            maxTokensInput={editDraft.maxTokensInput}
            onChangeMaxTokensInput={(maxTokensInput) =>
              patchEditDraft({ maxTokensInput })
            }
            systemPrompt={editDraft.systemPrompt}
            onChangeSystemPrompt={(systemPrompt) =>
              patchEditDraft({ systemPrompt })
            }
          />
        </View>

        {editError ? (
          <AppText variant="meta" tone="accent">
            {editError}
          </AppText>
        ) : null}

        <Pressable
          onPress={() => void onSaveAgentEdit()}
          disabled={editSaving}
          style={({ pressed }) => [
            styles.savePrimaryButton,
            {
              borderColor: colors.primary,
              opacity: pressed || editSaving ? 0.65 : 1,
            },
          ]}
        >
          {editSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <AppText variant="meta" style={{ color: colors.primary }}>
              Save agent
            </AppText>
          )}
        </Pressable>
      </>
    ) : null;

  const isSubView = controller.mode !== 'overview';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.container, { backgroundColor: colors.oppositePrimary }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          {isSubView ? (
            <Pressable
              onPress={() => controller.setMode('overview')}
              hitSlop={8}
              style={styles.headerSide}
            >
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={styles.headerSide} />
          )}
          <AppText variant="mono" style={styles.headerTitle}>
            {controller.mode === 'editAgent'
              ? 'Edit Agent'
              : controller.mode === 'switchAgent'
                ? 'Switch Agent'
                : 'Dialogue Settings'}
          </AppText>
          <Pressable onPress={onClose} hitSlop={8} style={styles.headerSide}>
            <AppText
              variant="meta"
              style={{ color: colors.primary, textAlign: 'right' }}
            >
              Done
            </AppText>
          </Pressable>
        </View>

        <KeyboardAwareScrollView
          enabled
          extraKeyboardSpace={0}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {controller.loading ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <>
              {controller.mode === 'overview' ? renderOverview() : null}
              {controller.mode === 'switchAgent' ? renderSwitchAgent() : null}
              {controller.mode === 'editAgent' ? renderEditAgent() : null}

              {controller.error ? (
                <AppText variant="meta" tone="accent">
                  {controller.error}
                </AppText>
              ) : null}
            </>
          )}
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
  headerSide: {
    width: 48,
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
  centerWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  block: {
    gap: 8,
  },
  blockLabel: {
    fontSize: 11,
    letterSpacing: 0.7,
  },
  helperText: {
    fontSize: 11,
  },
  agentCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  agentName: {
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
  },
  systemContextInput: {
    minHeight: 92,
    fontFamily: 'IBMPlexMono-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  saveContextButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
  },
  savePrimaryButton: {
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
});
