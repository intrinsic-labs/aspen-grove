import { computeSha256Hash } from '@application/services/content-hash-service';
import type { CompletionRequest, StreamChunk } from '@application/services/llm';
import { LlmProviderError } from '@application/services/llm';
import { fetch as expoFetch } from 'expo/fetch';
import {
  toAbortedRequestError,
  toInterruptedReason,
} from '../shared/interruption';
import { createRequestAbort } from '../shared/request-abort';
import { toLlmProviderError } from './errors';
import {
  headersToString,
  toCompletionText,
  toFinishReason,
  toJsonString,
  toOpenRouterMessages,
  toTokenUsage,
} from './helpers';
import type { OpenRouterConfig, OpenRouterStreamingPayload } from './types';

export const streamOpenRouterCompletion = async function* (input: {
  readonly config: OpenRouterConfig;
  readonly request: CompletionRequest;
  readonly timeoutMs: number;
}): AsyncIterable<StreamChunk> {
  const { config, request, timeoutMs } = input;

  const requestTimestamp = new Date();
  // Each request owns its abort wiring, so concurrent streams on one
  // adapter instance never cancel or time out each other.
  const abort = createRequestAbort({ timeoutMs, external: request.signal });
  const rawBodyChunks: string[] = [];
  let responseHeaders = '';
  let requestId: string | undefined;
  let modelIdentifier: string | undefined;
  let usage: StreamChunk['usage'];
  let finishReason: StreamChunk['finishReason'] = 'stop';
  let completionText = '';
  let parserBuffer = '';
  let eventLines: string[] = [];

  const createRawResponse = async (): Promise<NonNullable<StreamChunk['rawResponse']>> => {
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
    const body = {
      model: request.model,
      messages: toOpenRouterMessages(request.messages, request.systemPrompt),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stop: request.stopSequences,
      stream: true,
      stream_options: {
        include_usage: true,
      },
    };

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
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
      signal: abort.signal,
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
        fallbackMessage: `OpenRouter request failed (${response.status})`,
      });
    }

    if (!response.body || typeof response.body.getReader !== 'function') {
      throw new LlmProviderError({
        code: 'invalidRequest',
        message:
          'Streaming response body is unavailable in this runtime. Falling back to non-streaming is recommended.',
        provider: 'openrouter',
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

      const payload = JSON.parse(dataPayload) as OpenRouterStreamingPayload;
      modelIdentifier = payload.model ?? modelIdentifier;
      usage = toTokenUsage(payload.usage);

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
        interruptedReason: toInterruptedReason(error, abort.cause()),
        rawResponse: await createRawResponse(),
      };
      return;
    }

    const abortedError = toAbortedRequestError({
      error,
      abortCause: abort.cause(),
      provider: 'openrouter',
      label: 'OpenRouter streaming',
    });
    if (abortedError) {
      throw abortedError;
    }

    if (error instanceof LlmProviderError) {
      throw error;
    }

    throw new LlmProviderError({
      code: 'networkError',
      message: `OpenRouter streaming error: ${toJsonString(error)}`,
      provider: 'openrouter',
      retryable: true,
    });
  } finally {
    abort.dispose();
  }
};
