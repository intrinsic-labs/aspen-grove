import { DEFAULT_AGENT_TEMPERATURE } from '@application/services/agent-defaults';
import type { AgentConfiguration } from '@domain/entities';
import { heldMaxTokens } from '../../models/model-max-tokens';

/** A tree's starting Maximum Output Tokens when the agent sets none. */
export const DEFAULT_MAX_TOKENS = 4096;

/** `Slider(value: $tree.temperature, in: 0...1, step: 0.1)`. */
export const TEMPERATURE_RANGE = { min: 0, max: 1, step: 0.1 } as const;

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
    maxTokens: heldMaxTokens(
      configuration.maxTokens ?? DEFAULT_MAX_TOKENS,
      useMaxTokens,
      maxAllowed
    ),
    useMaxTokens,
  };
};

/** `Double.formatted()`: 0, 0.7, 1. */
export const formatTemperature = (value: number): string =>
  String(Math.round(value * 10) / 10);
