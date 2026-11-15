import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAppServices } from '@interface/composition';
import { useCreateLoomTree } from '@/interface/hooks/useCreateLoomTree';
import { validateAgentDraft } from '../../settings/agents/agent-editor-types';
import { useCreateAgentFromDraft } from '../../settings/agents/useCreateAgentFromDraft';
import type { OnboardingSetup } from './useOnboardingSetup';

/**
 * "Begin Weaving". With a model set up, it saves the connection, creates
 * the agent (the first becomes the default), records onboarding as done and
 * opens a first tree in place of onboarding. Without one it records
 * onboarding as done and closes, as Latent Spaces' button does; Home then
 * says what is missing.
 */
export const useFinishOnboarding = (setup: OnboardingSetup) => {
  const router = useRouter();
  const { repositories } = useAppServices();
  const createAgentFromDraft = useCreateAgentFromDraft();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createTree } = useCreateLoomTree(setError);

  const markDone = useCallback(
    () =>
      repositories.userPreferencesRepo.update({
        onboardingCompletedAt: new Date(),
      }),
    [repositories.userPreferencesRepo]
  );

  const close = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  const finish = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!setup.ready) {
        await setup.connections.saveNow();
        await markDone();
        close();
        return;
      }
      const invalid = validateAgentDraft(setup.draft);
      if (invalid) {
        setError(invalid);
        return;
      }
      await setup.connections.saveNow();
      const agent = await createAgentFromDraft(setup.draft);
      await markDone();
      await createTree({ agentId: agent.id, replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }, [busy, close, createAgentFromDraft, createTree, markDone, setup]);

  return { finish, busy, error };
};
