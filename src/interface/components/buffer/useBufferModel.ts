import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router/react-navigation';
import { describeProviderError } from '@application/services/llm';
import { isUsableTreeModelAgent } from '@application/services/resolve-tree-model-agent';
import type { Agent } from '@domain/entities';
import { parseModelRef, type ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import { toErrorMessage } from '../chat/error-message';
import { markTreeModelChanged } from '../chat/tree-model/tree-model-change-store';
import {
  bufferModelTokenCap,
  loadEligibleBufferModelOptions,
} from './buffer-model-options';
import {
  bufferModelIdFromRef,
  bufferProviderFromModelRef,
  connectedBufferModelProviders,
  initialBufferModelProvider,
  type BufferModelProvider,
} from './buffer-model-providers';
import type { ModelOption } from '../models/model-options';

const NO_OPTIONS: readonly ModelOption[] = [];

type TreeModel = {
  readonly agent: Agent | null;
  readonly provider: BufferModelProvider | null;
  readonly id: string | null;
};

const EMPTY_TREE_MODEL: TreeModel = { agent: null, provider: null, id: null };

/**
 * The buffer's explicit base-model choice. Catalog results fail closed through
 * the eligibility selector; selecting writes only the tree-owned model agent.
 */
export const useBufferModel = (treeId: ULID | undefined) => {
  const { adapters, repositories, useCases } = useAppServices();
  const [providers, setProviders] = useState<readonly BufferModelProvider[]>(
    []
  );
  const [provider, setProviderState] = useState<BufferModelProvider | null>(
    null
  );
  const [treeModel, setTreeModel] = useState<TreeModel>(EMPTY_TREE_MODEL);
  const [options, setOptions] = useState<readonly ModelOption[]>(NO_OPTIONS);
  const [settledFor, setSettledFor] = useState<BufferModelProvider | null>(
    null
  );
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const loadTreeAndConnections = useCallback(async () => {
    if (!treeId) {
      setLoaded(true);
      return;
    }
    try {
      const [tree, preferences, openRouterKey] = await Promise.all([
        repositories.treeRepo.findById(treeId),
        repositories.userPreferencesRepo.get(),
        adapters.credentialStore.getProviderApiKey('openrouter'),
      ]);
      const agent = tree?.defaultModelAgentId
        ? await repositories.agentRepo.findById(tree.defaultModelAgentId)
        : null;
      const usable = isUsableTreeModelAgent(agent, treeId) ? agent : null;
      const currentProvider = bufferProviderFromModelRef(usable?.modelRef);
      const connected = connectedBufferModelProviders({
        hasOpenRouterKey: Boolean(openRouterKey?.trim()),
        lmStudioEndpoint: preferences.lmstudioSettings.endpoint,
      });
      setProviders(connected);
      setTreeModel({
        agent: usable,
        provider: currentProvider,
        id: bufferModelIdFromRef(usable?.modelRef),
      });
      setProviderState((chosen) =>
        chosen && connected.includes(chosen)
          ? chosen
          : initialBufferModelProvider(currentProvider, connected)
      );
    } catch (caught) {
      setProviders([]);
      setProviderState(null);
      setTreeModel(EMPTY_TREE_MODEL);
      setError(toErrorMessage(caught));
    } finally {
      setLoaded(true);
    }
  }, [adapters.credentialStore, repositories, treeId]);

  useFocusEffect(
    useCallback(() => {
      void loadTreeAndConnections();
    }, [loadTreeAndConnections])
  );

  const loadCatalog = useCallback(
    async (forceRefresh = false) => {
      if (!provider) return;
      const request = ++latestRequest.current;
      setLoading(true);
      setError(null);
      try {
        const next = await loadEligibleBufferModelOptions(
          provider,
          adapters,
          forceRefresh
        );
        if (request === latestRequest.current) {
          setOptions(next);
          setSettledFor(provider);
        }
      } catch (caught) {
        if (request === latestRequest.current) {
          setOptions(NO_OPTIONS);
          setSettledFor(provider);
          setError(describeProviderError(caught, { provider }).message);
        }
      } finally {
        if (request === latestRequest.current) setLoading(false);
      }
    },
    [adapters, provider]
  );

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const chooseProvider = useCallback(
    (next: BufferModelProvider) => {
      // Re-choosing the current provider must not cancel its load: the
      // catalog effect only reruns when the provider changes.
      if (next === provider) return;
      ++latestRequest.current;
      setOptions(NO_OPTIONS);
      setSettledFor(null);
      setError(null);
      setLoading(true);
      setProviderState(next);
    },
    [provider]
  );

  const select = useCallback(
    async (modelId: string): Promise<boolean> => {
      if (!treeId || !provider) return false;
      const option = options.find((candidate) => candidate.id === modelId);
      if (!option) return false;
      setSaving(true);
      setError(null);
      try {
        const result = await useCases.updateTreeModelSettingsUseCase.execute({
          treeId,
          changes: {
            modelRef: parseModelRef(`${provider}:${modelId}`),
            modelName: option.label,
            useMaxTokens: true,
            maxTokens: bufferModelTokenCap(treeModel.agent?.configuration),
          },
        });
        setTreeModel({ agent: result.agent, provider, id: modelId });
        markTreeModelChanged(treeId);
        return true;
      } catch (caught) {
        setError(toErrorMessage(caught));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [options, provider, treeId, treeModel.agent?.configuration, useCases]
  );

  const currentId = treeModel.provider === provider ? treeModel.id : null;
  const selectedName =
    settledFor === treeModel.provider
      ? (options.find((option) => option.id === treeModel.id)?.label ?? null)
      : null;

  return {
    providers,
    provider,
    chooseProvider,
    options: settledFor === provider ? options : NO_OPTIONS,
    currentId,
    selectedName,
    loaded,
    loading,
    saving,
    error,
    refresh: useCallback(() => loadCatalog(true), [loadCatalog]),
    select,
  };
};
