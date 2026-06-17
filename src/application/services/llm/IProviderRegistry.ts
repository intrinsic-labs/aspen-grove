import type { Agent, SelectableProvider } from '@domain/entities';
import type { ModelRef } from '@domain/value-objects';
import type { ILlmProvider } from './ILlmProvider';

/**
 * Registry of provider adapters.
 *
 * The registry does **not** hold an "active provider" — provider routing is
 * resolved per request from each `Agent.modelRef`. Use `getProviderForAgent`
 * (or `getProviderForModelRef`) in the request path; `getProvider(name)` is a
 * lower-level escape hatch when callers already know the provider name.
 */
export interface IProviderRegistry {
  /**
   * Look up an adapter by provider name. Throws if no adapter is registered.
   */
  getProvider(provider: SelectableProvider): ILlmProvider;

  /**
   * Resolve the adapter responsible for a given Agent's model. The provider
   * is determined by the `modelRef` prefix.
   *
   * Throws if the agent is not a model agent, has no `modelRef`, or references
   * a provider that the registry doesn't know about.
   */
  getProviderForAgent(agent: Agent): ILlmProvider;

  /**
   * Resolve the adapter for a raw `ModelRef`. Useful when callers have a
   * `modelRef` in hand without the full Agent object.
   */
  getProviderForModelRef(modelRef: ModelRef): ILlmProvider;

  /**
   * Enumerate the providers this registry can route to.
   */
  getAvailableProviders(): readonly SelectableProvider[];
}
