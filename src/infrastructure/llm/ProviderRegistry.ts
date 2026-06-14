import type { ILlmProvider, IProviderRegistry } from '@application/services/llm';
import { SELECTABLE_PROVIDERS, type SelectableProvider } from '@domain/entities';
import type { LMStudioAdapter } from './LMStudioAdapter';
import type { OpenRouterAdapter } from './OpenRouterAdapter';

type ProviderAdapters = {
  readonly openrouter: OpenRouterAdapter;
  readonly lmstudio: LMStudioAdapter;
};

/**
 * Manages LLM provider adapters and allows runtime switching.
 */
export class ProviderRegistry implements IProviderRegistry {
  private activeProvider: SelectableProvider;
  private readonly adapters: ProviderAdapters;

  constructor(
    adapters: ProviderAdapters,
    initialProvider: SelectableProvider = 'openrouter'
  ) {
    this.adapters = adapters;
    this.activeProvider = initialProvider;
  }

  getActiveProvider(): ILlmProvider {
    return this.adapters[this.activeProvider];
  }

  getProvider(provider: SelectableProvider): ILlmProvider {
    return this.adapters[provider];
  }

  /**
   * Get the OpenRouter adapter specifically (for OpenRouter-specific operations).
   */
  getOpenRouterAdapter(): OpenRouterAdapter {
    return this.adapters.openrouter;
  }

  /**
   * Get the LM Studio adapter specifically (for LM Studio-specific operations like model discovery).
   */
  getLMStudioAdapter(): LMStudioAdapter {
    return this.adapters.lmstudio;
  }

  setActiveProvider(provider: SelectableProvider): void {
    this.activeProvider = provider;
  }

  getActiveProviderName(): SelectableProvider {
    return this.activeProvider;
  }

  getAvailableProviders(): readonly SelectableProvider[] {
    return SELECTABLE_PROVIDERS;
  }
}
