import { describe, expect, it } from '@jest/globals';
import type { OpenRouterCatalogModel } from '@application/services/llm';
import { CatalogModelOutputLimits } from './CatalogModelOutputLimits';

const catalog = (models: readonly OpenRouterCatalogModel[]) => ({
  getCachedModels: async () => models,
});

describe('CatalogModelOutputLimits', () => {
  const limits = new CatalogModelOutputLimits(
    catalog([
      { id: 'small/model', displayName: 'Small', maxCompletionTokens: 2048 },
      { id: 'open/model', displayName: 'Open' },
    ])
  );

  it("reads an OpenRouter model's output limit from the saved catalog", async () => {
    await expect(
      limits.maxOutputTokens('openrouter', 'small/model')
    ).resolves.toBe(2048);
  });

  it('knows none for an unlisted model, one without a limit, or LM Studio', async () => {
    await expect(
      limits.maxOutputTokens('openrouter', 'missing/model')
    ).resolves.toBeUndefined();
    await expect(
      limits.maxOutputTokens('openrouter', 'open/model')
    ).resolves.toBeUndefined();
    await expect(
      limits.maxOutputTokens('lmstudio', 'small/model')
    ).resolves.toBeUndefined();
  });
});

it('reads discovered direct-provider output limits without a network request', async () => {
  const limits = new CatalogModelOutputLimits(catalog([]), {
    anthropic: {
      getCachedModels: () => [
        {
          id: 'claude-example',
          displayName: 'Claude',
          maxCompletionTokens: 8192,
        },
      ],
    },
  });
  await expect(
    limits.maxOutputTokens('anthropic', 'claude-example')
  ).resolves.toBe(8192);
  await expect(
    limits.maxOutputTokens('openai', 'gpt-example')
  ).resolves.toBeUndefined();
});
