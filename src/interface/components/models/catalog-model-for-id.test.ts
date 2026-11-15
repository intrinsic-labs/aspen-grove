import { describe, expect, it } from '@jest/globals';
import { catalogModelForId } from './catalog-model-for-id';

const sonnet = {
  id: 'anthropic/claude-sonnet-4.5',
  label: 'Claude Sonnet 4.5',
  maxOutputTokens: 64000,
};
const freeLlama = {
  id: 'meta-llama/llama-3.3-70b-instruct:free',
  label: 'Llama 3.3 70B (free)',
  maxOutputTokens: 2048,
};
const llama = {
  id: 'meta-llama/llama-3.3-70b-instruct',
  label: 'Llama 3.3 70B',
  maxOutputTokens: 16384,
};
const CATALOG = [sonnet, freeLlama, llama];

describe('catalogModelForId', () => {
  it('finds a listed id', () => {
    expect(catalogModelForId('anthropic/claude-sonnet-4.5', CATALOG)).toBe(
      sonnet
    );
  });

  it('finds a typed id in another case or with spaces around it', () => {
    expect(catalogModelForId(' Anthropic/Claude-Sonnet-4.5 ', CATALOG)).toBe(
      sonnet
    );
  });

  it('finds the model a routing variant is of', () => {
    expect(
      catalogModelForId('anthropic/claude-sonnet-4.5:nitro', CATALOG)
    ).toBe(sonnet);
  });

  it('prefers a variant listed in its own right', () => {
    expect(
      catalogModelForId('meta-llama/llama-3.3-70b-instruct:free', CATALOG)
    ).toBe(freeLlama);
  });

  it('finds nothing for an id nothing listed matches', () => {
    expect(catalogModelForId('someone/new-model', CATALOG)).toBeUndefined();
    expect(
      catalogModelForId('someone/new-model:nitro', CATALOG)
    ).toBeUndefined();
    expect(catalogModelForId('', CATALOG)).toBeUndefined();
    expect(catalogModelForId(null, CATALOG)).toBeUndefined();
  });
});
