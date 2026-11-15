import { fetch as expoFetch } from 'expo/fetch';
import type { OpenRouterCatalogModel } from '@application/services/llm';
import {
  normalizeOpenRouterModel,
  type OpenRouterApiModel,
} from './catalog-normalize';

export type { OpenRouterCatalogModel } from '@application/services/llm';

// The list is paginated (500 per page by default, at most 1000); ask for the
// most so a growing catalog isn't cut short.
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models?limit=1000';
const CATALOG_TIMEOUT_MS = 15000;

/**
 * Fetch the public OpenRouter model catalog. No API key required.
 * Returns models sorted alphabetically by id.
 */
export const fetchOpenRouterCatalog = async (input?: {
  readonly timeoutMs?: number;
}): Promise<OpenRouterCatalogModel[]> => {
  const timeoutMs = input?.timeoutMs ?? CATALOG_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await expoFetch(OPENROUTER_MODELS_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter catalog request failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      readonly data?: readonly OpenRouterApiModel[];
    };
    const models = (payload.data ?? [])
      .filter((model) => typeof model.id === 'string' && model.id.length > 0)
      .map(normalizeOpenRouterModel);

    return models.sort((a, b) => a.id.localeCompare(b.id));
  } finally {
    clearTimeout(timeoutId);
  }
};
