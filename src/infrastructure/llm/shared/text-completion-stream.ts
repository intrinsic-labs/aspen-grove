import type {
  StreamChunk,
  TextCompletionRequest,
} from '@application/services/llm';
import { LlmProviderError } from '@application/services/llm';
import { fetch as expoFetch } from 'expo/fetch';
import {
  buildTextCompletionBody,
  decodeCompletionPayload,
} from './completion-wire';
import { toAbortedRequestError, toInterruptedReason } from './interruption';
import { createDirectRawCapture } from './raw-capture';
import { createRequestAbort } from './request-abort';
import { SseParser } from './sse-parser';
import { toStreamAbortTimeouts, type StreamTimeouts } from './stream-timeouts';
import { toInBandError } from './text-completion-request';
import type { TextTransport } from './text-transport';

const malformedEvent = (transport: TextTransport) =>
  new LlmProviderError({
    code: 'serverError',
    message: `${transport.label} sent an event that isn't JSON.`,
    provider: transport.provider,
    retryable: false,
  });

/**
 * One streaming text completion over SSE. Deltas are yielded as they arrive
 * and kept verbatim (whitespace-only included); the capture is the arrival
 * order of the bytes and is hashed before anything is derived from it. Once
 * any text has arrived, a failure ends the stream with a `done` chunk that
 * carries the reason out of band, so the partial text can be kept.
 */
export const streamTextCompletion = async function* (input: {
  readonly transport: TextTransport;
  readonly request: TextCompletionRequest;
  readonly timeouts: StreamTimeouts;
}): AsyncIterable<StreamChunk> {
  const { transport, request, timeouts } = input;
  const raw = createDirectRawCapture(new Date(), request.model);
  // One abort per request: concurrent streams never cancel each other.
  const abort = createRequestAbort({
    ...toStreamAbortTimeouts(timeouts),
    external: request.signal,
  });
  const decoder = new TextDecoder('utf-8');
  let text = '';
  let model: string | undefined;
  let usage: StreamChunk['usage'];
  let finishReason: StreamChunk['finishReason'] = 'stop';
  let terminal = false;

  try {
    const response = await expoFetch(transport.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...transport.headers,
      },
      body: JSON.stringify(
        buildTextCompletionBody(request, {
          stream: true,
          includeUsage: transport.includeUsage,
        })
      ),
      signal: abort.signal,
    });
    raw.headers(response.headers);
    if (!response.ok) {
      const responseBody = await response.text();
      throw transport.toError({
        status: response.status,
        responseHeaders: response.headers,
        responseBody,
        fallbackMessage: `${transport.label} request failed (${response.status})`,
      });
    }
    if (!response.body || typeof response.body.getReader !== 'function') {
      throw new LlmProviderError({
        code: 'invalidRequest',
        message: 'Streaming response body is unavailable in this runtime.',
        provider: transport.provider,
        retryable: false,
      });
    }

    const reader = response.body.getReader();
    const parser = new SseParser();
    while (true) {
      const { done, value } = await reader.read();
      if (!done) {
        // Any bytes count, keep-alive comments included.
        abort.markActivity();
      }
      const chunk = done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      raw.append(chunk);
      for (const data of parser.push(chunk, done)) {
        if (data.trim() === '[DONE]') {
          terminal = true;
          continue;
        }
        let payload: unknown;
        try {
          payload = JSON.parse(data);
        } catch {
          throw malformedEvent(transport);
        }
        const event = decodeCompletionPayload(payload);
        if (event.error) {
          throw toInBandError(transport, event.error);
        }
        model = event.model ?? model;
        // A usage-only event follows the last text; keep the last one seen.
        usage = event.usage ?? usage;
        if (event.finishReason) {
          terminal = true;
          finishReason = event.finishReason;
        }
        if (event.text) {
          text += event.text;
          yield { type: 'text', content: event.text };
        }
      }
      if (done) {
        break;
      }
    }

    if (!terminal) {
      // A dropped connection can end the body quietly; don't pass a
      // truncated continuation off as finished.
      throw new LlmProviderError({
        code: 'networkError',
        message: `${transport.label} stream ended before the response finished.`,
        provider: transport.provider,
        retryable: true,
      });
    }
    yield {
      type: 'done',
      content: text,
      usage,
      finishReason,
      rawResponse: await raw.finish(model),
    };
  } catch (error) {
    // Flush a half-received UTF-8 sequence into the capture before hashing.
    raw.append(decoder.decode());
    // Any text counts, a lone space included: it is the continuation so far.
    if (text.length > 0) {
      yield {
        type: 'done',
        content: text,
        usage,
        finishReason: 'error',
        interruptedReason: toInterruptedReason(error, abort.cause()),
        rawResponse: await raw.finish(model),
      };
      return;
    }
    throw (
      toAbortedRequestError({
        error,
        abortCause: abort.cause(),
        provider: transport.provider,
        label: transport.label,
      }) ??
      (error instanceof LlmProviderError
        ? error
        : new LlmProviderError({
            code: 'networkError',
            message: `${transport.label} streaming error: ${String(error)}`,
            provider: transport.provider,
            retryable: true,
          }))
    );
  } finally {
    abort.dispose();
  }
};
