import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import type { SelectableProvider } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import { useCreateLoomTree } from '@/interface/hooks/useCreateLoomTree';
import {
  validateAgentDraft,
  type AgentDraft,
} from '../settings/agents/agent-editor-types';
import {
  AGENT_TEMPLATES,
  DEFAULT_AGENT_TEMPLATE,
} from '../settings/agents/agent-templates';
import { useCreateAgentFromDraft } from '../settings/agents/useCreateAgentFromDraft';
import { useConnectionsController } from '../settings/connections/useConnectionsController';
import { lmStudioAgentDraft } from './onboarding-drafts';

export type OnboardingStep = 'provider' | 'agent';

/**
 * First-run setup: connect a provider, choose an agent, land in a tree.
 * Connections reuse the Settings controller (same autosave and storage);
 * the agent is created the same way Settings → Agents creates one.
 */
export const useOnboardingFlow = () => {
  const router = useRouter();
  const { repositories } = useAppServices();
  const connections = useConnectionsController();
  const createAgentFromDraft = useCreateAgentFromDraft();

  const [step, setStep] = useState<OnboardingStep>('provider');
  const [provider, setProvider] = useState<SelectableProvider>('openrouter');
  const [templateKey, setTemplateKey] = useState(DEFAULT_AGENT_TEMPLATE.key);
  const [customDraft, setCustomDraft] = useState<AgentDraft | null>(null);
  const [lmStudioModelId, setLmStudioModelId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createTree } = useCreateLoomTree(setError);

  const draft: AgentDraft = useMemo(() => {
    if (provider === 'lmstudio') {
      return lmStudioAgentDraft(lmStudioModelId);
    }
    if (customDraft) {
      return customDraft;
    }
    const template =
      AGENT_TEMPLATES.find((candidate) => candidate.key === templateKey) ??
      DEFAULT_AGENT_TEMPLATE;
    return template.draft;
  }, [customDraft, lmStudioModelId, provider, templateKey]);

  const canContinue =
    provider === 'openrouter'
      ? connections.apiKeyInput.trim().length > 0
      : connections.lmstudioEndpointInput.trim().length > 0;
  const canBegin = !busy && validateAgentDraft(draft) === null;

  const chooseProvider = useCallback((next: SelectableProvider) => {
    setProvider(next);
    setError(null);
  }, []);

  const chooseTemplate = useCallback((key: string) => {
    setTemplateKey(key);
    setCustomDraft(null);
  }, []);

  const markDone = useCallback(
    () =>
      repositories.userPreferencesRepo.update({
        onboardingCompletedAt: new Date(),
      }),
    [repositories.userPreferencesRepo]
  );

  const goToAgentStep = useCallback(async () => {
    if (!canContinue || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Save now so the agent step's model list reads the new connection.
      await connections.saveNow();
      setStep('agent');
    } finally {
      setBusy(false);
    }
  }, [busy, canContinue, connections]);

  const goBack = useCallback(() => {
    setError(null);
    setStep('provider');
  }, []);

  const skip = useCallback(async () => {
    if (busy) {
      return;
    }
    try {
      await markDone();
    } finally {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  }, [busy, markDone, router]);

  const begin = useCallback(async () => {
    const validationError = validateAgentDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await connections.saveNow();
      const agent = await createAgentFromDraft(draft);
      await markDone();
      await createTree({ agentId: agent.id, replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }, [connections, createAgentFromDraft, createTree, draft, markDone]);

  return {
    step,
    provider,
    connections,
    templateKey: customDraft ? null : templateKey,
    customDraft,
    draft,
    lmStudioModelId,
    busy,
    error,
    canContinue,
    canBegin,
    chooseProvider,
    chooseTemplate,
    setCustomDraft,
    setLmStudioModelId,
    goToAgentStep,
    goBack,
    skip,
    begin,
  };
};

export type OnboardingFlow = ReturnType<typeof useOnboardingFlow>;
