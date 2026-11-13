import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import type { Agent } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import { agentEditorRoutes } from './editor/agent-editor-routes';

/**
 * The Settings → Agents library: list and delete shared agents, pin the
 * default agent for new trees, and open the agent editor to create or edit
 * one. The list re-reads whenever the screen regains focus, so the editor's
 * save shows as it closes.
 */
export const useAgentsLibraryController = () => {
  const { repositories, useCases } = useAppServices();
  const router = useRouter();

  const [agents, setAgents] = useState<readonly Agent[]>([]);
  const [defaultAgentId, setDefaultAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);
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

  const openCreate = useCallback(
    () => router.push(agentEditorRoutes.create()),
    [router]
  );
  const openEdit = useCallback(
    (agent: Agent) => router.push(agentEditorRoutes.edit(agent.id)),
    [router]
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
    openCreate,
    openEdit,
    makeDefault,
    deleteAgent,
  };
};
