import type { SelectableProvider } from '@domain/entities';
import type { ILlmProvider } from './ILlmProvider';

/**
 * Registry for managing LLM provider adapters.
 * Allows switching between providers at runtime.
 */
export interface IProviderRegistry {
  /**
   * Get the currently active provider.
   */
  getActiveProvider(): ILlmProvider;

  /**
   * Get a specific provider adapter by name.
   */
  getProvider(provider: SelectableProvider): ILlmProvider;

  /**
   * Set the active provider.
   */
  setActiveProvider(provider: SelectableProvider): void;

  /**
   * Get the current active provider name.
   */
  getActiveProviderName(): SelectableProvider;

  /**
   * Get all available provider names.
   */
  getAvailableProviders(): readonly SelectableProvider[];
}
