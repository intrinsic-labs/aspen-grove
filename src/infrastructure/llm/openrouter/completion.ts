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
  toOpenRouterMessages,
  toTokenUsage,
  toToolCalls,
} from './helpers';
import { toLlmProviderError } from './errors';
import type { OpenRouterConfig, OpenRouterResponsePayload } from './types';

export const requestOpenRouterCompletion = async (input: {
  readonly config: OpenRouterConfig;
  readonly request: CompletionRequest;
  readonly timeoutMs: number;
}): Promise<CompletionResponse> => {
  const { config, request, timeoutMs } = input;
  const requestTimestamp = new Date();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = {
      model: request.model,
      messages: toOpenRouterMessages(request.messages, request.systemPrompt),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stop: request.stopSequences,
      tools: request.tools?.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      })),
      stream: false,
    };

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (config.appUrl) {
      headers['HTTP-Referer'] = config.appUrl;
    }
    if (config.appName) {
      headers['X-Title'] = config.appName;
    }

    const response = await expoFetch(config.endpoint, {
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
        fallbackMessage: `OpenRouter request failed (${response.status})`,
      });
    }

    const payload = JSON.parse(responseBody) as OpenRouterResponsePayload;
    const choice = payload.choices?.[0];

    return {
      content: toCompletionText(choice?.message?.content),
      finishReason: toFinishReason(choice?.finish_reason),
      usage: toTokenUsage(payload.usage),
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
        fallbackMessage: 'OpenRouter request timed out.',
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
