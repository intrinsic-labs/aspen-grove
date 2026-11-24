import type { CompletionRequest, Message } from '@application/services/llm';
import { invalidDirectRequest } from './errors';
import type { DirectProvider } from './types';

export const textOf = (message: Message, provider: DirectProvider): string => {
  if (typeof message.content === 'string') return message.content;
  return message.content
    .map((block) => {
      if (block.type !== 'text')
        throw invalidDirectRequest(
          provider,
          'This connection supports text messages only.'
        );
      return block.text;
    })
    .join('');
};

export const validateMaxTokens = (
  request: CompletionRequest,
  provider: DirectProvider
) => {
  if (
    request.maxTokens !== undefined &&
    (!Number.isInteger(request.maxTokens) || request.maxTokens <= 0)
  ) {
    throw invalidDirectRequest(
      provider,
      'The response token limit must be a positive whole number.'
    );
  }
};
