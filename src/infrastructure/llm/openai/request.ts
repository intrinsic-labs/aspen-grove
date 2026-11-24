import type { CompletionRequest } from '@application/services/llm';
import { invalidDirectRequest } from '../direct/errors';
import { textOf, validateMaxTokens } from '../direct/text-request';

export const openAIHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
});

export const openAIBody = (request: CompletionRequest, stream: boolean) => {
  validateMaxTokens(request, 'openai');
  if (request.stopSequences?.length) {
    throw invalidDirectRequest(
      'openai',
      'OpenAI Responses does not support stop sequences. Clear them for this model.'
    );
  }
  return {
    model: request.model,
    instructions: request.systemPrompt?.trim() || undefined,
    input: request.messages.map((message) => ({
      role: message.role,
      content: textOf(message, 'openai'),
    })),
    max_output_tokens: request.maxTokens,
    // Reasoning models reject sampling parameters with their default effort.
    // Keep provider defaults; older GPT-4 text families support temperature.
    ...(/^gpt-4(?:o|\.1|\.5)(?:-|$)/.test(request.model)
      ? { temperature: request.temperature }
      : {}),
    store: false,
    stream,
  };
};
