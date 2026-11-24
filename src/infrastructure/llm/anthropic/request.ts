import type { CompletionRequest } from '@application/services/llm';
import { textOf, validateMaxTokens } from '../direct/text-request';

export const ANTHROPIC_API_VERSION = '2026-10-21';
export const anthropicHeaders = (apiKey: string, workspaceId?: string) => ({
  ...(workspaceId ? { 'anthropic-workspace-id': workspaceId } : {}),
  'x-api-key': apiKey,
  'anthropic-version': ANTHROPIC_API_VERSION,
  'Content-Type': 'application/json',
});

export const anthropicBody = (request: CompletionRequest, stream: boolean) => {
  validateMaxTokens(request, 'anthropic');
  // Messages has no system role: combine the agent prompt and system nodes,
  // in their original order, into its dedicated top-level system field.
  const system = [
    request.systemPrompt?.trim(),
    ...request.messages
      .filter((message) => message.role === 'system')
      .map((message) => textOf(message, 'anthropic')),
  ]
    .filter(Boolean)
    .join('\n\n');
  const messages = request.messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role,
      content: textOf(message, 'anthropic'),
    }));
  // Current Claude models reject assistant prefill. A loom can continue from
  // any node, so add a wire-only user cue when the path ends on a model turn.
  if (messages.length === 0 || messages.at(-1)?.role === 'assistant') {
    messages.push({
      role: 'user',
      content: 'Continue from where you left off.',
    });
  }
  return {
    model: request.model,
    messages,
    ...(system ? { system } : {}),
    max_tokens: request.maxTokens ?? 4096,
    stop_sequences: request.stopSequences,
    // Sampling parameters were removed in API version 2026-10-21.
    stream,
  };
};
