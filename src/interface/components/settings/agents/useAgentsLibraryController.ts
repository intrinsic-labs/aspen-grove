import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  DEFAULT_AGENT_SYSTEM_PROMPT,
  DEFAULT_AGENT_TEMPERATURE,
  DEFAULT_MODEL_AGENT_PERMISSIONS,
} from '@application/services/agent-defaults';
import { pinDefaultModelAgentIfUnset } from '@application/services/resolve-default-model-agent';
import type { Agent, SelectableProvider } from '@domain/entities';
import { isSelectableProvider } from '@domain/entities';
import { parseModelRef } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import {
  parsedDraftNumbers,
  type AgentDraft,
} from './agent-editor-types';

export type AgentEditorState =
  | { readonly mode: 'create' }
  | { readonly mode: 'edit'; readonly agent: Agent };

/**
 * Split an agent's modelRef into picker-friendly parts. Unknown providers
 * (e.g. a future `anthropic:` ref) fall back to showing the full ref as an
 * OpenRouter custom identifier rather than crashing the editor.
 */
export const draftFromAgent = (agent: Agent): AgentDraft => {
  const modelRef = agent.modelRef ?? '';
  const colonIndex = modelRef.indexOf(':');
  const prefix = colonIndex === -1 ? '' : modelRef.slice(0, colonIndex);
  const provider: SelectableProvider = isSelectableProvider(prefix)
    ? prefix
    : 'openrouter';
  const modelIdentifier = isSelectableProvider(prefix)
    ? modelRef.slice(colonIndex + 1)
    : modelRef;

  return {
    name: agent.name,
    provider,
    modelIdentifier,
    temperatureInput:
      typeof agent.configuration.temperature === 'number'
        ? String(agent.configuration.temperature)
        : String(DEFAULT_AGENT_TEMPERATURE),
    maxTokensInput:
      typeof agent.configuration.maxTokens === 'number'
        ? String(agent.configuration.maxTokens)
        : '',
    systemPrompt:
      agent.configuration.systemPrompt ?? DEFAULT_AGENT_SYSTEM_PROMPT,
  };
};

/**
 * The Settings → Agents library: list, create, edit, delete shared agents
 * and pin the default agent for new trees.
 */
export const useAgentsLibraryController = () => {
  const { repositories, useCases } = useAppServices();

  const [agents, setAgents] = useState<readonly Agent[]>([]);
  const [defaultAgentId, setDefaultAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);
  const [editor, setEditor] = useState<AgentEditorState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [sharedAgents, prefs] = await Promise.all([
        repositories.agentRepo.findSharedModels(true),
        repositories.userPreferencesRepo.get(),
      ]);
      setAgents(sharedAgents);
      setDefaultAgentId(prefs.defaultModelAgentId ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [repositories.agentRepo, repositories.userPreferencesRepo]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return undefined;
    }, [refresh])
  );

  const openCreate = useCallback(() => setEditor({ mode: 'create' }), []);
  const openEdit = useCallback(
    (agent: Agent) => setEditor({ mode: 'edit', agent }),
    []
  );
  const closeEditor = useCallback(() => setEditor(null), []);

  const submitEditor = useCallback(
    async (draft: AgentDraft): Promise<void> => {
      if (!editor) {
        return;
      }

      const modelRef = parseModelRef(
        `${draft.provider}:${draft.modelIdentifier.trim()}`
      );
      const { temperature, maxTokens } = parsedDraftNumbers(draft);
      const configuration = {
        systemPrompt: draft.systemPrompt.trim() || DEFAULT_AGENT_SYSTEM_PROMPT,
        temperature,
        maxTokens,
      };

      if (editor.mode === 'create') {
        const created = await useCases.createSharedAgentUseCase.execute({
          name: draft.name,
          modelRef,
          configuration,
          permissions: DEFAULT_MODEL_AGENT_PERMISSIONS,
        });
        // The first agent a user creates becomes the default for new trees;
        // replacing an existing pin stays an explicit "Make default" action.
        await pinDefaultModelAgentIfUnset(created.id, {
          userPreferencesRepository: repositories.userPreferencesRepo,
        });
      } else {
        await useCases.updateAgentConfigurationUseCase.execute({
          agentId: editor.agent.id,
          changes: {
            name: draft.name.trim(),
            modelRef,
            configuration,
          },
        });
      }

      setEditor(null);
      await refresh();
    },
    [
      editor,
      refresh,
      repositories.userPreferencesRepo,
      useCases.createSharedAgentUseCase,
      useCases.updateAgentConfigurationUseCase,
    ]
  );

  const makeDefault = useCallback(
    async (agentId: string) => {
      if (busyAgentId) {
        return;
      }
      setBusyAgentId(agentId);
      try {
        await repositories.userPreferencesRepo.update({
          defaultModelAgentId: agentId as Agent['id'],
        });
        setDefaultAgentId(agentId);
      } catch (caught) {
        Alert.alert(
          'Could not set default',
          caught instanceof Error ? caught.message : String(caught)
        );
      } finally {
        setBusyAgentId(null);
      }
    },
    [busyAgentId, repositories.userPreferencesRepo]
  );

  const deleteAgent = useCallback(
    (agent: Agent) => {
      if (busyAgentId) {
        return;
      }
      Alert.alert(
        'Delete agent?',
        `"${agent.name}" will be removed. Deletion is blocked while any tree still uses it.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setBusyAgentId(agent.id);
              try {
                await useCases.deleteAgentUseCase.execute({
                  agentId: agent.id,
                });
                if (defaultAgentId === agent.id) {
                  setDefaultAgentId(null);
                }
                await refresh();
              } catch (caught) {
                Alert.alert(
                  'Could not delete agent',
                  caught instanceof Error ? caught.message : String(caught)
                );
              } finally {
                setBusyAgentId(null);
              }
            },
          },
        ]
      );
    },
    [busyAgentId, defaultAgentId, refresh, useCases.deleteAgentUseCase]
  );

  return {
    agents,
    defaultAgentId,
    loading,
    busyAgentId,
    error,
    editor,
    openCreate,
    openEdit,
    closeEditor,
    submitEditor,
    makeDefault,
    deleteAgent,
  };
};
