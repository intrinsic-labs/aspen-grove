import { useCallback, useMemo, useState } from 'react';
import { buildProviderApiKey } from '../../chat/provider-key';
import type { AgentDraft } from '../../settings/agents/agent-editor-types';
import {
  AGENT_TEMPLATES,
  DEFAULT_AGENT_TEMPLATE,
} from '../../settings/agents/agent-templates';
import { useConnectionsController } from '../../settings/connections/useConnectionsController';
import { useProviderKey } from '../../settings/connections/useProviderKey';
import { lmStudioAgentDraft } from '../onboarding-drafts';

/** The providers onboarding can set up; Anthropic and OpenAI are added in Settings. */
export type OnboardingProvider = 'openrouter' | 'lmstudio';
export const ONBOARDING_PROVIDERS: readonly OnboardingProvider[] = [
  'openrouter',
  'lmstudio',
];

/**
 * What the user has chosen on onboarding's last page: a provider, its
 * connection (the same controller, autosave and storage as Settings →
 * Connections) and a model. `ready` says whether Begin Weaving can create
 * an agent that will answer.
 */
export const useOnboardingSetup = () => {
  const connections = useConnectionsController();
  const openRouterKey = useProviderKey('openrouter');
  const [provider, setProvider] = useState<OnboardingProvider>('openrouter');
  const [templateKey, setTemplateKey] = useState(DEFAULT_AGENT_TEMPLATE.key);
  const [lmStudioModelId, setLmStudioModelId] = useState('');
  const [editingKey, setEditingKey] = useState(false);
  // Counts saves from the key sheet, so the page can reveal the Model rows.
  const [keySaves, setKeySaves] = useState(0);

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
    openRouterKey.hasStoredKey || buildProviderApiKey('openrouter') !== null;

  const ready =
    provider === 'openrouter'
      ? hasOpenRouterKey
      : lmStudioModelId.trim().length > 0;

  const chooseProvider = useCallback((next: OnboardingProvider) => {
    setProvider(next);
  }, []);

  const saveKey = useCallback(
    async (key: string) => {
      // The key is in secure storage before the sheet closes, so Begin
      // Weaving can't race it.
      if (await openRouterKey.save(key)) {
        setEditingKey(false);
        setKeySaves((count) => count + 1);
      }
    },
    [openRouterKey]
  );

  return {
    connections,
    openRouterKey,
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
    keySaves,
    draft,
    ready,
  };
};

export type OnboardingSetup = ReturnType<typeof useOnboardingSetup>;
