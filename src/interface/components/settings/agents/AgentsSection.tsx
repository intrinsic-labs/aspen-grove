import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Agent } from '@domain/entities';
import {
  DEFAULT_AGENT_SYSTEM_PROMPT,
  DEFAULT_AGENT_TEMPERATURE,
} from '@application/services/agent-defaults';
import { AppText, SettingsSection } from '@/interface/ui/value-objects';
import { AgentEditorSheet } from './AgentEditorSheet';
import {
  draftFromAgent,
  useAgentsLibraryController,
} from './useAgentsLibraryController';
import type { AgentDraft } from './agent-editor-types';

type AgentsSectionProps = {
  readonly colors: {
    readonly line: string;
    readonly primary: string;
    readonly secondary: string;
  };
};

const EMPTY_DRAFT: AgentDraft = {
  name: '',
  provider: 'openrouter',
  modelIdentifier: '',
  temperatureInput: String(DEFAULT_AGENT_TEMPERATURE),
  maxTokensInput: '',
  systemPrompt: DEFAULT_AGENT_SYSTEM_PROMPT,
};

/**
 * Settings → Agents library. Shared agents are the reusable "profiles"
 * trees reference; each tree can also fork a private copy from the chat ⚙️
 * sheet. Editing a shared agent here affects every tree that uses it.
 */
export const AgentsSection = ({ colors }: AgentsSectionProps) => {
  const controller = useAgentsLibraryController();

  const renderAgent = (agent: Agent) => {
    const isDefault = controller.defaultAgentId === agent.id;
    const isBusy = controller.busyAgentId === agent.id;

    return (
      <Pressable
        key={agent.id}
        onPress={() => controller.openEdit(agent)}
        disabled={isBusy}
        style={({ pressed }) => [
          styles.agentRow,
          { opacity: isBusy ? 0.5 : pressed ? 0.75 : 1 },
        ]}
      >
        <View style={styles.agentHeader}>
          <AppText variant="body" style={styles.agentName}>
            {agent.name}
          </AppText>
          {isDefault && (
            <View style={styles.defaultBadge}>
              <Ionicons name="star" size={12} color={colors.primary} />
              <AppText variant="meta" style={{ color: colors.primary }}>
                Default
              </AppText>
            </View>
          )}
        </View>
        <AppText
          variant="meta"
          style={{ color: colors.secondary, marginTop: 2 }}
        >
          {agent.modelRef ?? '(no modelRef)'}
          {typeof agent.configuration.temperature === 'number'
            ? `  ·  temp ${agent.configuration.temperature}`
            : ''}
          {typeof agent.configuration.maxTokens === 'number'
            ? `  ·  max ${agent.configuration.maxTokens}`
            : ''}
        </AppText>

        <View style={styles.actionRow}>
          {!isDefault && (
            <Pressable
              onPress={() => controller.makeDefault(agent.id)}
              disabled={isBusy}
              hitSlop={6}
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
            >
              <AppText variant="meta" style={{ color: colors.primary }}>
                Make default
              </AppText>
            </Pressable>
          )}
          <Pressable
            onPress={() => controller.deleteAgent(agent)}
            disabled={isBusy}
            hitSlop={6}
            style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
          >
            <AppText variant="meta" style={{ color: colors.secondary }}>
              Delete
            </AppText>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <SettingsSection
        title="Agents"
        footer="Agents pair a model with a system prompt and generation settings. New trees use the default agent; each tree can switch or customize its own from the chat's settings."
      >
        {controller.loading ? (
          <AppText
            variant="meta"
            style={[styles.statusText, { color: colors.secondary }]}
          >
            Loading…
          </AppText>
        ) : null}

        {!controller.loading ? controller.agents.map(renderAgent) : null}

        {!controller.loading && controller.agents.length === 0 ? (
          <AppText
            variant="meta"
            style={[styles.statusText, { color: colors.secondary }]}
          >
            No agents yet. Create one to start weaving.
          </AppText>
        ) : null}

        {!controller.loading ? (
          <Pressable
            onPress={controller.openCreate}
            style={({ pressed }) => [
              styles.newAgentRow,
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <AppText variant="meta" style={{ color: colors.primary }}>
              New Agent
            </AppText>
          </Pressable>
        ) : null}

        {controller.error ? (
          <AppText variant="meta" tone="accent" style={styles.statusText}>
            {controller.error}
          </AppText>
        ) : null}
      </SettingsSection>

      <AgentEditorSheet
        visible={controller.editor !== null}
        title={controller.editor?.mode === 'edit' ? 'Edit Agent' : 'New Agent'}
        initialDraft={
          controller.editor?.mode === 'edit'
            ? draftFromAgent(controller.editor.agent)
            : EMPTY_DRAFT
        }
        showTemplates={controller.editor?.mode === 'create'}
        submitLabel={controller.editor?.mode === 'edit' ? 'Save' : 'Create'}
        onCancel={controller.closeEditor}
        onSubmit={controller.submitEditor}
      />
    </>
  );
};

const styles = StyleSheet.create({
  agentRow: {
    paddingVertical: 12,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentName: {
    fontWeight: '500',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 20,
  },
  statusText: {
    paddingVertical: 10,
  },
  newAgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
});
