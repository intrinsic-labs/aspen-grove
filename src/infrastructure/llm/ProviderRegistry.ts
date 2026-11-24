import {
  selectableProviderFromModelRef,
  type ILlmProvider,
  type IProviderRegistry,
} from '@application/services/llm';
import {
  ROUTABLE_PROVIDERS,
  type Agent,
  type RoutableProvider,
} from '@domain/entities';
import type { ModelRef } from '@domain/value-objects';
import type { LMStudioAdapter } from './LMStudioAdapter';
import type { AnthropicAdapter } from './AnthropicAdapter';
import type { OpenAIAdapter } from './OpenAIAdapter';
import type { OpenRouterAdapter } from './OpenRouterAdapter';

type ProviderAdapters = {
  readonly openrouter: OpenRouterAdapter;
  readonly lmstudio: LMStudioAdapter;
  readonly anthropic: AnthropicAdapter;
  readonly openai: OpenAIAdapter;
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

  getProvider(provider: RoutableProvider): ILlmProvider {
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

  getAvailableProviders(): readonly RoutableProvider[] {
    return ROUTABLE_PROVIDERS;
  }

  /** Authenticated direct-provider catalog discovery. */
  getAnthropicAdapter(): AnthropicAdapter {
    return this.adapters.anthropic;
  }

  getOpenAIAdapter(): OpenAIAdapter {
    return this.adapters.openai;
  }

  /** OpenRouter-specific catalog concerns. Prefer per-agent routing for generation. */
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
