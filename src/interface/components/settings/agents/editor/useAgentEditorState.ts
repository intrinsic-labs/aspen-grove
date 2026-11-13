import { useCallback, useState } from 'react';
import type { Agent } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import { agentDraftToConfig } from '../agent-draft-to-config';
import { draftFromAgent, EMPTY_AGENT_DRAFT } from '../agent-draft-from-agent';
import { validateAgentDraft, type AgentDraft } from '../agent-editor-types';
import type { AgentTemplate } from '../agent-templates';
import { useCreateAgentFromDraft } from '../useCreateAgentFromDraft';

/**
 * The agent editor's state, shared by its pages (the Form, the model
 * browser and a model's page): the draft, the agent it edits (none while
 * creating), and saving it. `save` resolves true once the agent is saved.
 */
export const useAgentEditorState = () => {
  const { repositories, useCases } = useAppServices();
  const createAgentFromDraft = useCreateAgentFromDraft();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [draft, setDraft] = useState<AgentDraft>(EMPTY_AGENT_DRAFT);
  const [loaded, setLoaded] = useState(false);
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (agentId: string | undefined) => {
      try {
        const found = agentId
          ? await repositories.agentRepo.findById(agentId as ULID)
          : null;
        if (agentId && !found) {
          setError('This agent no longer exists.');
        }
        setAgent(found);
        setDraft(found ? draftFromAgent(found) : EMPTY_AGENT_DRAFT);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setLoaded(true);
      }
    },
    [repositories.agentRepo]
  );

  const patchDraft = useCallback(
    (changes: Partial<AgentDraft>) =>
      setDraft((current) => ({ ...current, ...changes })),
    []
  );

  const applyTemplate = useCallback((template: AgentTemplate) => {
    setDraft(template.draft);
    setTemplateKey(template.key);
    setError(null);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    const invalid = validateAgentDraft(draft);
    if (invalid) {
      setError(invalid);
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      if (agent) {
        const { modelRef, configuration } = agentDraftToConfig(draft);
        await useCases.updateAgentConfigurationUseCase.execute({
          agentId: agent.id,
          changes: { name: draft.name.trim(), modelRef, configuration },
        });
      } else {
        await createAgentFromDraft(draft);
      }
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSaving(false);
      return false;
    }
  }, [
    agent,
    createAgentFromDraft,
    draft,
    useCases.updateAgentConfigurationUseCase,
  ]);

  return {
    loaded,
    load,
    draft,
    patchDraft,
    templateKey,
    applyTemplate,
    saving,
    error,
    save,
  };
};

export type AgentEditorState = ReturnType<typeof useAgentEditorState>;
