import {
  ROUTABLE_PROVIDERS,
  isRoutableProvider,
  type RoutableProvider,
} from '@domain/entities';
import type { ModelRef } from '@domain/value-objects';

/** True when a modelRef names an implemented backend adapter. */
export const isRoutableModelRef = (modelRef: ModelRef | string): boolean => {
  const colonIndex = modelRef.indexOf(':');
  return colonIndex !== -1 && isRoutableProvider(modelRef.slice(0, colonIndex));
};

/** Historical name: resolves any routable backend provider, including those without picker UI. */
export const selectableProviderFromModelRef = (
  modelRef: ModelRef
): RoutableProvider => {
  const colonIndex = modelRef.indexOf(':');
  if (colonIndex === -1) {
    // parseModelRef should have caught this, but guard defensively.
    throw new Error(
      `Malformed modelRef "${modelRef}": expected "{provider}:{identifier}".`
    );
  }

  const prefix = modelRef.slice(0, colonIndex);
  if (!isRoutableProvider(prefix)) {
    throw new Error(
      `Provider "${prefix}" is not currently routable. ` +
        `Supported providers: ${ROUTABLE_PROVIDERS.join(', ')}.`
    );
  }

  return prefix;
};
