import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { DEFAULT_AGENT_SYSTEM_PROMPT } from '@application/services/agent-defaults';
import type { Agent, LoomTree } from '@domain/entities';
import { parseModelRef, type ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import {
  parsedDraftNumbers,
  type AgentDraft,
} from '../../settings/agents/agent-editor-types';

export type DialogueSettingsMode = 'overview' | 'editAgent' | 'switchAgent';

type UseDialogueSettingsControllerInput = {
  readonly treeId: ULID | null;
  readonly visible: boolean;
  /**
   * Called after any mutation that can change how the session generates
   * (agent config, model, or tree re-pointing) so the chat controller can
   * re-initialize its session.
   */
  readonly onSessionInvalidated: () => void | Promise<void>;
};

/**
 * State + actions for the chat ⚙️ sheet: view the tree's agent, edit it
 * (directly when tree-owned; after an explicit shared-vs-fork choice when
 * shared), switch to another shared agent, and edit the tree-level system
 * context.
 */
export const useDialogueSettingsController = ({
  treeId,
  visible,
  onSessionInvalidated,
}: UseDialogueSettingsControllerInput) => {
  const { repositories, useCases } = useAppServices();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<DialogueSettingsMode>('overview');
  const [tree, setTree] = useState<LoomTree | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [sharedAgents, setSharedAgents] = useState<readonly Agent[]>([]);
  const [referencingTreeCount, setReferencingTreeCount] = useState(0);
  const [systemContextInput, setSystemContextInput] = useState('');
  const [savedSystemContext, setSavedSystemContext] = useState('');

  const isTreeOwned = Boolean(agent?.ownerTreeId);

  const load = useCallback(async () => {
    if (!treeId) {
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const loadedTree = await repositories.treeRepo.findById(treeId);
      if (!loadedTree) {
        throw new Error(`Loom Tree not found: ${treeId}`);
      }

      const loadedAgent = loadedTree.defaultModelAgentId
        ? await repositories.agentRepo.findById(loadedTree.defaultModelAgentId)
        : null;

      const shared = await repositories.agentRepo.findSharedModels(true);
      const referencing =
        loadedAgent && !loadedAgent.ownerTreeId
          ? await repositories.treeRepo.findByDefaultModelAgentId(
              loadedAgent.id,
              true
            )
          : [];

      setTree(loadedTree);
      setAgent(loadedAgent);
      setSharedAgents(shared);
      setReferencingTreeCount(referencing.length);
      setSystemContextInput(loadedTree.systemContext ?? '');
      setSavedSystemContext(loadedTree.systemContext ?? '');
      setMode('overview');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [repositories.agentRepo, repositories.treeRepo, treeId]);

  useEffect(() => {
    if (visible) {
      void load();
    }
  }, [load, visible]);

  const afterMutation = useCallback(async () => {
    await load();
    await onSessionInvalidated();
  }, [load, onSessionInvalidated]);

  /**
   * Entry point for the "Edit agent" action. Tree-owned agents are editable
   * directly; shared agents require an explicit choice between mutating the
   * shared agent (affects every referencing tree) and forking a private copy.
   */
  const onEditAgent = useCallback(() => {
    if (!agent || !tree) {
      return;
    }
    if (agent.ownerTreeId) {
      setMode('editAgent');
      return;
    }

    const otherTreeCount = Math.max(0, referencingTreeCount - 1);
    Alert.alert(
      'Shared agent',
      otherTreeCount > 0
        ? `"${agent.name}" is shared — edits affect ${otherTreeCount} other ${
            otherTreeCount === 1 ? 'tree' : 'trees'
          }.`
        : `"${agent.name}" is a shared library agent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit shared agent',
          onPress: () => setMode('editAgent'),
        },
        {
          text: 'Customize for this tree only',
          onPress: () => {
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                await useCases.forkAgentForTreeUseCase.execute({
                  sourceAgentId: agent.id,
                  treeId: tree.id,
                });
                await afterMutation();
                setMode('editAgent');
              } catch (caught) {
                setError(
                  caught instanceof Error ? caught.message : String(caught)
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ]
    );
  }, [
    afterMutation,
    agent,
    referencingTreeCount,
    tree,
    useCases.forkAgentForTreeUseCase,
  ]);

  const submitAgentEdit = useCallback(
    async (draft: AgentDraft): Promise<void> => {
      if (!agent) {
        return;
      }
      const modelRef = parseModelRef(
        `${draft.provider}:${draft.modelIdentifier.trim()}`
      );
      const { temperature, maxTokens } = parsedDraftNumbers(draft);

      await useCases.updateAgentConfigurationUseCase.execute({
        agentId: agent.id,
        changes: {
          name: draft.name.trim(),
          modelRef,
          configuration: {
            systemPrompt:
              draft.systemPrompt.trim() || DEFAULT_AGENT_SYSTEM_PROMPT,
            temperature,
            maxTokens,
          },
        },
      });
      await afterMutation();
    },
    [afterMutation, agent, useCases.updateAgentConfigurationUseCase]
  );

  const switchToAgent = useCallback(
    async (targetAgentId: ULID) => {
      if (!tree || busy) {
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await useCases.updateTreeDefaultAgentUseCase.execute({
          treeId: tree.id,
          modelAgentId: targetAgentId,
        });
        await afterMutation();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setBusy(false);
      }
    },
    [afterMutation, busy, tree, useCases.updateTreeDefaultAgentUseCase]
  );

  const systemContextDirty = systemContextInput !== savedSystemContext;

  const saveSystemContext = useCallback(async () => {
    if (!tree || busy || !systemContextDirty) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await repositories.treeRepo.update({
        id: tree.id,
        changes: { systemContext: systemContextInput.trim() },
      });
      setSavedSystemContext(systemContextInput);
      await onSessionInvalidated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    onSessionInvalidated,
    repositories.treeRepo,
    systemContextDirty,
    systemContextInput,
    tree,
  ]);

  return {
    loading,
    busy,
    error,
    mode,
    setMode,
    tree,
    agent,
    isTreeOwned,
    sharedAgents,
    referencingTreeCount,
    onEditAgent,
    submitAgentEdit,
    switchToAgent,
    systemContextInput,
    setSystemContextInput,
    systemContextDirty,
    saveSystemContext,
  };
};
