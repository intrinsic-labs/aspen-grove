import { computeSha256Hash } from '@application/services/content-hash-service';
import type {
  CompletionRequest,
  CompletionResponse,
} from '@application/services/llm';
import { fetch as expoFetch } from 'expo/fetch';
import {
  headersToString,
  toCompletionText,
  toFinishReason,
  toLMStudioMessages,
  toTokenUsage,
  toToolCalls,
} from './helpers';
import { toLlmProviderError } from './errors';
import type { LMStudioConfig, LMStudioResponsePayload } from './types';

/**
 * Makes a non-streaming completion request to LM Studio's OpenAI-compatible
 * endpoint (`/v1/chat/completions`).
 *
 * Why not the native `/api/v1/chat`?
 * - Native uses `input` instead of `messages` and treats history via stateful
 *   `previous_response_id` chains — incompatible with branching loom trees,
 *   where each branch needs an independent message history including prior
 *   assistant turns.
 * - OpenAI-compat accepts the same shape we already send to OpenRouter, so
 *   one body builder covers both providers.
 *
 * Trade-off: LM Studio's pre-configured MCP integrations are only available
 * through the native endpoint. The `useMcpTools` config flag is effectively
 * a no-op here — it's retained for forward compatibility if/when we add a
 * hybrid path for MCP-enabled requests.
 */
export const requestLMStudioCompletion = async (input: {
  readonly config: LMStudioConfig;
  readonly request: CompletionRequest;
  readonly timeoutMs: number;
}): Promise<CompletionResponse> => {
  const { config, request, timeoutMs } = input;
  const requestTimestamp = new Date();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = config.endpoint.replace(/\/$/, '');
    const url = `${endpoint}/v1/chat/completions`;

    const messages = toLMStudioMessages(request.messages, request.systemPrompt);

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stop: request.stopSequences,
      stream: false,
    };

    // Only include tools if MCP is enabled and tools are provided
    if (config.useMcpTools && request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      }));
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.apiToken) {
      headers['Authorization'] = `Bearer ${config.apiToken}`;
    }

    const response = await expoFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const responseBody = await response.text();
    const responseTimestamp = new Date();
    const latencyMs = responseTimestamp.getTime() - requestTimestamp.getTime();
    const responseHeaders = headersToString(response.headers);
    const rawBytes = `${responseHeaders}\n\n${responseBody}`;
    const rawBytesHash = await computeSha256Hash(rawBytes);

    if (!response.ok) {
      throw toLlmProviderError({
        status: response.status,
        responseHeaders: response.headers,
        responseBody,
        fallbackMessage: `LM Studio request failed (${response.status})`,
      });
    }

    const payload = JSON.parse(responseBody) as LMStudioResponsePayload;
    const choice = payload.choices?.[0];

    return {
      content: toCompletionText(choice?.message?.content),
      finishReason: toFinishReason(choice?.finish_reason),
      usage: toTokenUsage(payload.usage, payload.stats),
      toolCalls: toToolCalls(choice?.message?.tool_calls),
      rawResponse: {
        rawBytes,
        rawBytesHash,
        requestTimestamp,
        responseTimestamp,
        latencyMs,
        requestId:
          response.headers.get('x-request-id') ??
          response.headers.get('request-id') ??
          undefined,
        modelIdentifier: payload.model,
        responseBody,
        responseHeaders,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw toLlmProviderError({
        status: 408,
        fallbackMessage: 'LM Studio request timed out.',
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
