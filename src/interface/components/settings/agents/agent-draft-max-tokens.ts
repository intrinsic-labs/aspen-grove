import { heldMaxTokens, maxTokensAllowed } from '../../models/model-max-tokens';
import type { ModelOption } from '../../models/model-options';
import type { AgentDraft } from './agent-editor-types';

type MaxTokensFields = Pick<AgentDraft, 'maxTokensInput' | 'useMaxTokens'>;

/** The Max Tokens field as a positive whole number, if it holds one. */
export const parseMaxTokensInput = (input: string): number | undefined => {
  const value = Number(input.trim());
  return input.trim().length > 0 && Number.isInteger(value) && value > 0
    ? value
    : undefined;
};

/**
 * Max Tokens for a newly chosen model, by the rule a tree's Model Settings
 * follows (`heldMaxTokens`): the model's limit with "Always use maximum
 * allowed" on, otherwise the typed value held to that limit. An empty field
 * (the provider's default) stays empty. Null when the field already fits.
 */
export const maxTokensForChosenModel = (
  draft: MaxTokensFields,
  option: ModelOption
): Pick<AgentDraft, 'maxTokensInput'> | null => {
  const typed = parseMaxTokensInput(draft.maxTokensInput);
  const useMaxTokens = draft.useMaxTokens ?? false;
  if (!useMaxTokens && typed === undefined) {
    return null;
  }
  const held = heldMaxTokens(
    typed ?? maxTokensAllowed(option),
    useMaxTokens,
    maxTokensAllowed(option)
  );
  return held === typed ? null : { maxTokensInput: String(held) };
};

/**
 * A value typed into Max Tokens, capped at the model's limit when the model
 * is known. Typing a number is choosing one, so "Always use maximum allowed"
 * goes off.
 */
export const typedMaxTokens = (
  input: string,
  option: ModelOption | undefined
): MaxTokensFields => {
  const typed = parseMaxTokensInput(input);
  const limit = option ? maxTokensAllowed(option) : undefined;
  return {
    maxTokensInput:
      typed !== undefined && limit !== undefined && typed > limit
        ? String(limit)
        : input,
    useMaxTokens: false,
  };
};
