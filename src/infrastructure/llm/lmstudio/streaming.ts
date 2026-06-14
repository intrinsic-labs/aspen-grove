import { computeSha256Hash } from '@application/services/content-hash-service';
import type {
  CompletionRequest,
  StreamChunk,
  StreamInterruptionReason,
} from '@application/services/llm';
import { LlmProviderError } from '@application/services/llm';
import { fetch as expoFetch } from 'expo/fetch';
import { toLlmProviderError } from './errors';
import {
  headersToString,
  toCompletionText,
  toFinishReason,
  toJsonString,
  toLMStudioMessages,
  toTokenUsage,
} from './helpers';
import type { LMStudioConfig, LMStudioStreamingPayload } from './types';

const toInterruptedReason = (error: unknown): StreamInterruptionReason => {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'timeout';
  }

  if (error instanceof LlmProviderError) {
    if (error.code === 'timeout') {
      return 'timeout';
    }
    if (error.code === 'networkError') {
      return 'network';
    }
    return 'provider_error';
  }

  return 'network';
};

/**
 * Makes a streaming completion request to LM Studio's native API.
 * Uses /api/v1/chat with stream: true which supports MCP tools.
 */
export const streamLMStudioCompletion = async function* (input: {
  readonly config: LMStudioConfig;
  readonly request: CompletionRequest;
  readonly timeoutMs: number;
}): AsyncIterable<StreamChunk> {
  const { config, request, timeoutMs } = input;

  const requestTimestamp = new Date();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const rawBodyChunks: string[] = [];
  let responseHeaders = '';
  let requestId: string | undefined;
  let modelIdentifier: string | undefined;
  let usage: StreamChunk['usage'];
  let finishReason: StreamChunk['finishReason'] = 'stop';
  let completionText = '';
  let parserBuffer = '';
  let eventLines: string[] = [];

  const createRawResponse = async (): Promise<
    NonNullable<StreamChunk['rawResponse']>
  > => {
    const responseBody = rawBodyChunks.join('');
    const responseTimestamp = new Date();
    const latencyMs = responseTimestamp.getTime() - requestTimestamp.getTime();
    const rawBytes = `${responseHeaders}\n\n${responseBody}`;
    const rawBytesHash = await computeSha256Hash(rawBytes);

    return {
      rawBytes,
      rawBytesHash,
      requestTimestamp,
      responseTimestamp,
      latencyMs,
      requestId,
      modelIdentifier: modelIdentifier ?? request.model,
      responseBody,
      responseHeaders,
    };
  };

  try {
    const endpoint = config.endpoint.replace(/\/$/, '');
    const url = `${endpoint}/api/v1/chat`;

    const messages = toLMStudioMessages(request.messages, request.systemPrompt);

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stop: request.stopSequences,
      stream: true,
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
      Accept: 'text/event-stream',
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

    responseHeaders = headersToString(response.headers);
    requestId =
      response.headers.get('x-request-id') ??
      response.headers.get('request-id') ??
      undefined;

    if (!response.ok) {
      const responseBody = await response.text();
      throw toLlmProviderError({
        status: response.status,
        responseHeaders: response.headers,
        responseBody,
        fallbackMessage: `LM Studio request failed (${response.status})`,
      });
    }

    if (!response.body || typeof response.body.getReader !== 'function') {
      throw new LlmProviderError({
        code: 'invalidRequest',
        message:
          'Streaming response body is unavailable in this runtime. Falling back to non-streaming is recommended.',
        provider: 'lmstudio',
        retryable: false,
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    const processEvent = async (): Promise<StreamChunk | null> => {
      if (eventLines.length === 0) {
        return null;
      }

      const dataPayload = eventLines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice('data:'.length).trimStart())
        .join('\n')
        .trim();

      eventLines = [];

      if (!dataPayload || dataPayload === '[DONE]') {
        return null;
      }

      const payload = JSON.parse(dataPayload) as LMStudioStreamingPayload;
      modelIdentifier = payload.model ?? modelIdentifier;
      usage = toTokenUsage(payload.usage, payload.stats);

      const choice = payload.choices?.[0];
      if (choice?.finish_reason) {
        finishReason = toFinishReason(choice.finish_reason);
      }

      const deltaText = toCompletionText(choice?.delta?.content);
      if (!deltaText) {
        return null;
      }

      completionText += deltaText;
      return {
        type: 'text',
        content: deltaText,
      };
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      rawBodyChunks.push(chunk);
      parserBuffer += chunk;

      let newlineIndex = parserBuffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = parserBuffer.slice(0, newlineIndex).replace(/\r$/, '');
        parserBuffer = parserBuffer.slice(newlineIndex + 1);

        if (line.length === 0) {
          const streamChunk = await processEvent();
          if (streamChunk) {
            yield streamChunk;
          }
        } else {
          eventLines.push(line);
        }

        newlineIndex = parserBuffer.indexOf('\n');
      }
    }

    const trailing = decoder.decode();
    if (trailing) {
      rawBodyChunks.push(trailing);
      parserBuffer += trailing;
    }

    if (parserBuffer.length > 0) {
      const trailingLines = parserBuffer
        .split('\n')
        .map((line) => line.replace(/\r$/, ''));
      for (const line of trailingLines) {
        if (line.length === 0) {
          const streamChunk = await processEvent();
          if (streamChunk) {
            yield streamChunk;
          }
        } else {
          eventLines.push(line);
        }
      }
    }

    const trailingChunk = await processEvent();
    if (trailingChunk) {
      yield trailingChunk;
    }

    yield {
      type: 'done',
      content: completionText,
      usage,
      finishReason,
      rawResponse: await createRawResponse(),
    };
  } catch (error) {
    if (completionText.trim().length > 0) {
      yield {
        type: 'done',
        content: completionText,
        usage,
        finishReason: 'error',
        interruptedReason: toInterruptedReason(error),
        rawResponse: await createRawResponse(),
      };
      return;
    }

    if (error instanceof LlmProviderError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new LlmProviderError({
        code: 'timeout',
        message: 'LM Studio streaming request timed out.',
        provider: 'lmstudio',
        retryable: true,
      });
    }

    throw new LlmProviderError({
      code: 'networkError',
      message: `LM Studio streaming error: ${toJsonString(error)}`,
      provider: 'lmstudio',
      retryable: true,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};
