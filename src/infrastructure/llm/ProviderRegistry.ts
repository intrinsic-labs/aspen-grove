import {
  selectableProviderFromModelRef,
  type ILlmProvider,
  type IProviderRegistry,
} from '@application/services/llm';
import {
  SELECTABLE_PROVIDERS,
  type Agent,
  type SelectableProvider,
} from '@domain/entities';
import type { ModelRef } from '@domain/value-objects';
import type { LMStudioAdapter } from './LMStudioAdapter';
import type { OpenRouterAdapter } from './OpenRouterAdapter';

type ProviderAdapters = {
  readonly openrouter: OpenRouterAdapter;
  readonly lmstudio: LMStudioAdapter;
};

/**
 * Holds provider adapters and resolves which one should handle a given
 * request based on the requesting Agent's `modelRef`.
 *
 * There is intentionally no "active provider" concept: every request carries
 * the agent (and therefore the provider) with it.
 */
export class ProviderRegistry implements IProviderRegistry {
  private readonly adapters: ProviderAdapters;

  constructor(adapters: ProviderAdapters) {
    this.adapters = adapters;
  }

  getProvider(provider: SelectableProvider): ILlmProvider {
    const adapter = this.adapters[provider];
    if (!adapter) {
      throw new Error(`No adapter registered for provider: ${provider}`);
    }
    return adapter;
  }

  getProviderForAgent(agent: Agent): ILlmProvider {
    if (agent.type !== 'model') {
      throw new Error(
        `Cannot resolve provider: agent "${agent.id}" is not a model agent.`
      );
    }
    if (!agent.modelRef) {
      throw new Error(
        `Cannot resolve provider: agent "${agent.id}" has no modelRef.`
      );
    }
    return this.getProviderForModelRef(agent.modelRef);
  }

  getProviderForModelRef(modelRef: ModelRef): ILlmProvider {
    const providerName = selectableProviderFromModelRef(modelRef);
    return this.getProvider(providerName);
  }

  getAvailableProviders(): readonly SelectableProvider[] {
    return SELECTABLE_PROVIDERS;
  }

  /**
   * Get the OpenRouter adapter specifically. Used for OpenRouter-specific
   * concerns (e.g., catalog discovery) where the generic interface isn't
   * enough. Prefer `getProviderForAgent` for normal request routing.
   */
  getOpenRouterAdapter(): OpenRouterAdapter {
    return this.adapters.openrouter;
  }

  /**
   * Get the LM Studio adapter specifically. Used for LM Studio-specific
   * concerns like model discovery against a running server. Prefer
   * `getProviderForAgent` for normal request routing.
   */
  getLMStudioAdapter(): LMStudioAdapter {
    return this.adapters.lmstudio;
  }
}
