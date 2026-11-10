import { DEFAULT_AGENT_SYSTEM_PROMPT } from '@application/services/agent-defaults';
import type { AgentConfiguration } from '@domain/entities';
import { parseModelRef, type ModelRef } from '@domain/value-objects';
import { parsedDraftNumbers, type AgentDraft } from './agent-editor-types';

/** The modelRef and configuration an agent draft saves as. */
export const agentDraftToConfig = (
  draft: AgentDraft
): { readonly modelRef: ModelRef; readonly configuration: AgentConfiguration } => {
  const { temperature, maxTokens } = parsedDraftNumbers(draft);
  return {
    modelRef: parseModelRef(
      `${draft.provider}:${draft.modelIdentifier.trim()}`
    ),
    configuration: {
      systemPrompt: draft.systemPrompt.trim() || DEFAULT_AGENT_SYSTEM_PROMPT,
      temperature,
      maxTokens,
    },
  };
};
