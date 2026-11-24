import { fetch as expoFetch } from 'expo/fetch';
import {
  LlmProviderError,
  type OpenRouterCatalogModel,
} from '@application/services/llm';
import { createRequestAbort } from '../shared/request-abort';
import { toAbortedRequestError } from '../shared/interruption';
import { directProviderError, parseErrorBody } from './errors';
import type { DirectConfig, DirectProtocol } from './types';
import { normalizeAnthropicModel } from '../anthropic/catalog-normalize';
import { normalizeOpenAIModel } from '../openai/catalog-normalize';

/** Authenticated model lists; Anthropic uses cursor pagination, OpenAI returns one list. */
export const fetchDirectCatalog = async (input: {
  config: DirectConfig;
  protocol: DirectProtocol;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<OpenRouterCatalogModel[]> => {
  const { config, protocol } = input;
  const abort = createRequestAbort({
    timeoutMs: input.timeoutMs,
    external: input.signal,
  });
  const models = new Map<string, OpenRouterCatalogModel>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  try {
    do {
      const url = new URL('models', config.endpoint);
      if (protocol.provider === 'anthropic') {
        url.searchParams.set('limit', '1000');
        if (cursor) url.searchParams.set('after_id', cursor);
      }
      const response = await expoFetch(url.toString(), {
        method: 'GET',
        headers: protocol.headers(config.apiKey, config.workspaceId),
        signal: abort.signal,
      });
      const text = await response.text();
      if (!response.ok)
        throw directProviderError(
          protocol.provider,
          response.status,
          parseErrorBody(text),
          response.headers
        );
      const page = JSON.parse(text) as {
        data?: unknown[];
        has_more?: boolean;
        last_id?: string;
      };
      if (!Array.isArray(page.data)) throw new Error('Missing model list');
      for (const entry of page.data) {
        const model =
          protocol.provider === 'anthropic'
            ? normalizeAnthropicModel(entry)
            : normalizeOpenAIModel(entry);
        if (model) models.set(model.id, model);
      }
      cursor = undefined;
      if (protocol.provider === 'anthropic' && page.has_more) {
        if (!page.last_id || cursors.has(page.last_id))
          throw new Error('Invalid model list cursor');
        cursor = page.last_id;
        cursors.add(cursor);
      }
    } while (cursor);
    return [...models.values()].sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    throw (
      toAbortedRequestError({
        error,
        abortCause: abort.cause(),
        provider: protocol.provider,
        label: protocol.provider,
      }) ??
      (error instanceof LlmProviderError
        ? error
        : new LlmProviderError({
            provider: protocol.provider,
            code: 'networkError',
            message: `Couldn't load ${protocol.provider} models. Try again.`,
            retryable: true,
          }))
    );
  } finally {
    abort.dispose();
  }
};
