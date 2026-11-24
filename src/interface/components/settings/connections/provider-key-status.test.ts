import { describe, expect, it } from '@jest/globals';
import { providerKeyConfig } from './provider-key-config';
import { KEY_TEST_IDLE, keyStatusText } from './provider-key-status';

const anthropic = providerKeyConfig('anthropic');

describe('keyStatusText', () => {
  it("says what a missing key costs, in the provider's own words", () => {
    expect(keyStatusText(anthropic, false, KEY_TEST_IDLE)).toBe(
      'No key stored yet. Claude models from Anthropic need one.'
    );
    expect(
      keyStatusText(providerKeyConfig('openrouter'), false, KEY_TEST_IDLE)
    ).toBe('No key stored yet. Models through OpenRouter need one.');
  });

  it('says a key is stored until it has been tested', () => {
    expect(keyStatusText(anthropic, true, KEY_TEST_IDLE)).toBe(
      'A key is stored on this device.'
    );
    expect(keyStatusText(anthropic, true, { status: 'checking' })).toBe(
      'Checking the key…'
    );
  });

  it('reports a passed test with the model count', () => {
    expect(
      keyStatusText(anthropic, true, { status: 'ok', modelCount: 3 })
    ).toBe('Anthropic accepted the key. 3 models available.');
    expect(
      keyStatusText(anthropic, true, { status: 'ok', modelCount: 1 })
    ).toBe('Anthropic accepted the key. 1 model available.');
  });

  it('reports a failed test with its plain line', () => {
    expect(
      keyStatusText(anthropic, true, { status: 'failed', message: 'Nope.' })
    ).toBe('Nope.');
  });
});
