import { useCallback, useMemo, useState } from 'react';
import type { SelectableProvider } from '@domain/entities';
import { buildProviderApiKey } from '../../chat/provider-key';
import type { AgentDraft } from '../../settings/agents/agent-editor-types';
import {
  AGENT_TEMPLATES,
  DEFAULT_AGENT_TEMPLATE,
} from '../../settings/agents/agent-templates';
import { useConnectionsController } from '../../settings/connections/useConnectionsController';
import { lmStudioAgentDraft } from '../onboarding-drafts';

/**
 * What the user has chosen on onboarding's last page: a provider, its
 * connection (the same controller, autosave and storage as Settings →
 * Connections) and a model. `ready` says whether Begin Weaving can create
 * an agent that will answer.
 */
export const useOnboardingSetup = () => {
  const connections = useConnectionsController();
  const [provider, setProvider] = useState<SelectableProvider>('openrouter');
  const [templateKey, setTemplateKey] = useState(DEFAULT_AGENT_TEMPLATE.key);
  const [lmStudioModelId, setLmStudioModelId] = useState('');
  const [editingKey, setEditingKey] = useState(false);

  const draft: AgentDraft = useMemo(() => {
    if (provider === 'lmstudio') {
      return lmStudioAgentDraft(lmStudioModelId);
    }
    const template =
      AGENT_TEMPLATES.find((candidate) => candidate.key === templateKey) ??
      DEFAULT_AGENT_TEMPLATE;
    return template.draft;
  }, [lmStudioModelId, provider, templateKey]);

  const hasOpenRouterKey =
    connections.apiKeyInput.trim().length > 0 ||
    buildProviderApiKey('openrouter') !== null;

  const ready =
    provider === 'openrouter'
      ? hasOpenRouterKey
      : lmStudioModelId.trim().length > 0;

  const chooseProvider = useCallback((next: SelectableProvider) => {
    setProvider(next);
  }, []);

  const saveKey = useCallback(
    (key: string) => {
      connections.setApiKeyInput(key);
      setEditingKey(false);
    },
    [connections]
  );

  return {
    connections,
    provider,
    chooseProvider,
    templateKey,
    setTemplateKey,
    lmStudioModelId,
    setLmStudioModelId,
    hasOpenRouterKey,
    editingKey,
    openKeyEditor: useCallback(() => setEditingKey(true), []),
    closeKeyEditor: useCallback(() => setEditingKey(false), []),
    saveKey,
    draft,
    ready,
  };
};

export type OnboardingSetup = ReturnType<typeof useOnboardingSetup>;
