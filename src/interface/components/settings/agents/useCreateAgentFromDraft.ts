import { useCallback } from 'react';
import { DEFAULT_MODEL_AGENT_PERMISSIONS } from '@application/services/agent-defaults';
import { pinDefaultModelAgentIfUnset } from '@application/services/resolve-default-model-agent';
import type { Agent } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import { agentDraftToConfig } from './agent-draft-to-config';
import type { AgentDraft } from './agent-editor-types';

/**
 * Creates a shared agent from an editor draft. The first agent a user
 * creates becomes the default for new trees; replacing an existing pin
 * stays an explicit "Make default". Used by Settings → Agents and onboarding.
 */
export const useCreateAgentFromDraft = () => {
  const { repositories, useCases } = useAppServices();

  return useCallback(
    async (draft: AgentDraft): Promise<Agent> => {
      const { modelRef, configuration } = agentDraftToConfig(draft);
      const created = await useCases.createSharedAgentUseCase.execute({
        name: draft.name,
        modelRef,
        configuration,
        permissions: DEFAULT_MODEL_AGENT_PERMISSIONS,
      });
      await pinDefaultModelAgentIfUnset(created.id, {
        userPreferencesRepository: repositories.userPreferencesRepo,
      });
      return created;
    },
    [repositories.userPreferencesRepo, useCases.createSharedAgentUseCase]
  );
};
