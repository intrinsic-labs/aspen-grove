import { describe, expect, it } from '@jest/globals';
import { pickerProviders, providerOptions } from './provider-options';

const none = { anthropic: false, openai: false };

describe('pickerProviders', () => {
  it('offers only OpenRouter and LM Studio before any direct key is stored', () => {
    expect(pickerProviders(none)).toEqual(['openrouter', 'lmstudio']);
  });

  it('adds each direct provider once its key is stored, in Settings order', () => {
    expect(pickerProviders({ anthropic: true, openai: false })).toEqual([
      'openrouter',
      'anthropic',
      'lmstudio',
    ]);
    expect(pickerProviders({ anthropic: true, openai: true })).toEqual([
      'openrouter',
      'anthropic',
      'openai',
      'lmstudio',
    ]);
  });

  it('keeps the current provider listed after its key is removed', () => {
    expect(pickerProviders(none, 'openai')).toEqual([
      'openrouter',
      'openai',
      'lmstudio',
    ]);
  });
});

describe('providerOptions', () => {
  it('labels each provider as people know it', () => {
    expect(
      providerOptions(['openrouter', 'anthropic', 'openai', 'lmstudio'])
    ).toEqual([
      { value: 'openrouter', label: 'OpenRouter' },
      { value: 'anthropic', label: 'Anthropic' },
      { value: 'openai', label: 'OpenAI' },
      { value: 'lmstudio', label: 'LM Studio' },
    ]);
  });
});
