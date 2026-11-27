import { chatUrlToCompletionsUrl } from '../shared/completion-wire';
import type { TextTransport } from '../shared/text-transport';
import { toLlmProviderError } from './errors';
import type { OpenRouterConfig } from './types';

/**
 * OpenRouter's legacy text route, `/completions` beside the stored chat URL
 * (a custom origin or base path is kept), with the chat path's auth and
 * attribution headers.
 */
export const toOpenRouterTextTransport = (
  config: OpenRouterConfig
): TextTransport => ({
  provider: 'openrouter',
  label: 'OpenRouter',
  url: chatUrlToCompletionsUrl(config.endpoint, 'openrouter'),
  headers: {
    Authorization: `Bearer ${config.apiKey}`,
    ...(config.appUrl ? { 'HTTP-Referer': config.appUrl } : {}),
    ...(config.appName ? { 'X-Title': config.appName } : {}),
  },
  includeUsage: true,
  toError: toLlmProviderError,
});
