import { parseModelRef } from '@domain/value-objects';
import {
  isRoutableModelRef,
  selectableProviderFromModelRef,
} from '@application/services/llm';
import { AnthropicAdapter } from './AnthropicAdapter';
import { OpenAIAdapter } from './OpenAIAdapter';
import { OpenRouterAdapter } from './OpenRouterAdapter';
import { LMStudioAdapter } from './LMStudioAdapter';
import { ProviderRegistry } from './ProviderRegistry';

it('routes each direct provider through its own per-agent adapter', () => {
  const anthropic = new AnthropicAdapter();
  const openai = new OpenAIAdapter();
  const registry = new ProviderRegistry({
    anthropic,
    openai,
    openrouter: new OpenRouterAdapter(),
    lmstudio: new LMStudioAdapter(),
  });
  expect(registry.getAvailableProviders()).toEqual([
    'openrouter',
    'lmstudio',
    'anthropic',
    'openai',
  ]);
  expect(
    registry.getProviderForModelRef(parseModelRef('anthropic:claude-opus-5-5'))
  ).toBe(anthropic);
  expect(
    registry.getProviderForModelRef(parseModelRef('openai:gpt-6.2-astra'))
  ).toBe(openai);
  expect(registry.getAnthropicAdapter()).toBe(anthropic);
  expect(registry.getOpenAIAdapter()).toBe(openai);
  expect(isRoutableModelRef('anthropic:claude-example')).toBe(true);
  expect(isRoutableModelRef('openai:gpt-example')).toBe(true);
  expect(isRoutableModelRef('google:legacy-model')).toBe(false);
  expect(
    selectableProviderFromModelRef(parseModelRef('openai:gpt-example'))
  ).toBe('openai');
});
