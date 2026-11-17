import { DEFAULT_AGENT_TEMPERATURE } from '@application/services/agent-defaults';
import type { AgentConfiguration } from '@domain/entities';
import { heldMaxTokens } from '../../models/model-max-tokens';

/** `Slider(value: $tree.temperature, in: 0...1, step: 0.1)`. */
export const TEMPERATURE_RANGE = { min: 0, max: 1, step: 0.1 } as const;

export type TreeModelValues = {
  readonly temperature: number;
  /**
   * `null` when the agent sets none: requests then send no `max_tokens` and
   * the provider's default applies (`requestMaxTokens`), so the form says so
   * rather than show a number it doesn't send.
   */
  readonly maxTokens: number | null;
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
    maxTokens:
      configuration.maxTokens === undefined && !useMaxTokens
        ? null
        : heldMaxTokens(
            configuration.maxTokens ?? maxAllowed,
            useMaxTokens,
            maxAllowed
          ),
    useMaxTokens,
  };
};

/** `Double.formatted()`: 0, 0.7, 1. */
export const formatTemperature = (value: number): string =>
  String(Math.round(value * 10) / 10);
