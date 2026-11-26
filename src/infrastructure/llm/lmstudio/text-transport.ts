import { originToCompletionsUrl } from '../shared/completion-wire';
import type { TextTransport } from '../shared/text-transport';
import { toLlmProviderError } from './errors';
import type { LMStudioConfig } from './types';

/** LM Studio's `/v1/completions`: applies no prompt template to the text. */
export const toLMStudioTextTransport = (
  config: LMStudioConfig
): TextTransport => ({
  provider: 'lmstudio',
  label: 'LM Studio',
  url: originToCompletionsUrl(config.endpoint),
  headers: config.apiToken
    ? { Authorization: `Bearer ${config.apiToken}` }
    : {},
  includeUsage: false,
  toError: toLlmProviderError,
});
