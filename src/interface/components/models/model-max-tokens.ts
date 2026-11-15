import type { ModelOption } from './model-options';

/** Latent Spaces' limit for a model it doesn't know (LLM.swift:43). */
export const UNKNOWN_MODEL_MAX_TOKENS = 4096;
/** A known model whose provider names no limit (LLM.swift:62). */
export const UNLISTED_LIMIT_MAX_TOKENS = 8192;

/**
 * The most output tokens a model allows: `tree.model.getMaxTokens()`
 * (LLM.swift:42-66), the Maximum Output Tokens slider's top end.
 */
export const maxTokensAllowed = (option: ModelOption | undefined): number =>
  option
    ? (option.maxOutputTokens ?? UNLISTED_LIMIT_MAX_TOKENS)
    : UNKNOWN_MODEL_MAX_TOKENS;

/**
 * Maximum Output Tokens as a form shows it for a model allowing
 * `maxAllowed`: that limit with "Always use maximum allowed" on, otherwise
 * the saved value held to it, as Latent Spaces' slider range holds
 * `tree.maxTokens`. A tree's Model Settings and the agent editor both save
 * this when a model is chosen, so a request never asks for more than the
 * model allows.
 */
export const heldMaxTokens = (
  maxTokens: number,
  useMaxTokens: boolean,
  maxAllowed: number
): number =>
  useMaxTokens ? maxAllowed : Math.min(maxAllowed, Math.max(1, maxTokens));
