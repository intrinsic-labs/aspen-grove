import {
  SELECTABLE_PROVIDERS,
  isSelectableProvider,
  type SelectableProvider,
} from '@domain/entities';
import type { ModelRef } from '@domain/value-objects';

/**
 * Map an `Agent.modelRef` to the `SelectableProvider` that should handle it.
 *
 * A `ModelRef` is formatted `{provider}:{identifier}` (e.g.,
 * `openrouter:anthropic/claude-sonnet-4`). The provider prefix tells us which
 * adapter in the registry can fulfill requests for this model.
 *
 * Throws if the prefix is unknown or not currently supported by the registry.
 * The domain's broader `Provider` set (anthropic, openai, google, etc.) is a
 * superset of what the app can actually route — only providers in
 * `SELECTABLE_PROVIDERS` are reachable today.
 */
export const selectableProviderFromModelRef = (
  modelRef: ModelRef
): SelectableProvider => {
  const colonIndex = modelRef.indexOf(':');
  if (colonIndex === -1) {
    // parseModelRef should have caught this, but guard defensively.
    throw new Error(
      `Malformed modelRef "${modelRef}": expected "{provider}:{identifier}".`
    );
  }

  const prefix = modelRef.slice(0, colonIndex);
  if (!isSelectableProvider(prefix)) {
    throw new Error(
      `Provider "${prefix}" is not currently routable. ` +
        `Supported providers: ${SELECTABLE_PROVIDERS.join(', ')}.`
    );
  }

  return prefix;
};
