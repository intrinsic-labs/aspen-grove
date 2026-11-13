import { DEFAULT_AGENT_TEMPERATURE } from '@application/services/agent-defaults';
import type { AgentConfiguration } from '@domain/entities';
import type { ModelOption } from '../../models/model-options';

/** Latent Spaces' limit for a model it doesn't know (LLM.swift:43). */
export const UNKNOWN_MODEL_MAX_TOKENS = 4096;
/** A known model whose provider names no limit (LLM.swift:62). */
export const UNLISTED_LIMIT_MAX_TOKENS = 8192;
/** A tree's starting Maximum Output Tokens when the agent sets none. */
export const DEFAULT_MAX_TOKENS = 4096;

/** `Slider(value: $tree.temperature, in: 0...1, step: 0.1)`. */
export const TEMPERATURE_RANGE = { min: 0, max: 1, step: 0.1 } as const;

/** The slider's top end: `tree.model.getMaxTokens()` (LLM.swift:42-66). */
export const maxTokensAllowed = (option: ModelOption | undefined): number =>
  option
    ? (option.maxOutputTokens ?? UNLISTED_LIMIT_MAX_TOKENS)
    : UNKNOWN_MODEL_MAX_TOKENS;

export type TreeModelValues = {
  readonly temperature: number;
  readonly maxTokens: number;
  readonly useMaxTokens: boolean;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** What the form shows for an agent's configuration and model. */
export const toTreeModelValues = (
  configuration: AgentConfiguration,
  maxAllowed: number
): TreeModelValues => {
  const useMaxTokens = configuration.useMaxTokens ?? false;
  return {
    temperature: clamp(
      configuration.temperature ?? DEFAULT_AGENT_TEMPERATURE,
      TEMPERATURE_RANGE.min,
      TEMPERATURE_RANGE.max
    ),
    maxTokens: useMaxTokens
      ? maxAllowed
      : clamp(configuration.maxTokens ?? DEFAULT_MAX_TOKENS, 1, maxAllowed),
    useMaxTokens,
  };
};

/** `Double.formatted()`: 0, 0.7, 1. */
export const formatTemperature = (value: number): string =>
  String(Math.round(value * 10) / 10);

/** `Int.formatted()` in en-US: 4,096. */
export const formatTokenCount = (value: number): string =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
