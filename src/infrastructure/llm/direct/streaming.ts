import { fetch as expoFetch } from 'expo/fetch';
import {
  LlmProviderError,
  type CompletionRequest,
  type StreamChunk,
} from '@application/services/llm';
import { createRequestAbort } from '../shared/request-abort';
import {
  toAbortedRequestError,
  toInterruptedReason,
} from '../shared/interruption';
import {
  toStreamAbortTimeouts,
  type StreamTimeouts,
} from '../shared/stream-timeouts';
import { SseParser } from '../shared/sse-parser';
import { directProviderError, parseErrorBody } from './errors';
import { createRawCapture } from '../shared/raw-capture';
import type { DirectConfig, DirectProtocol, StreamState } from './types';

export async function* streamDirectCompletion(input: {
  config: DirectConfig;
  protocol: DirectProtocol;
  request: CompletionRequest;
  timeouts: StreamTimeouts;
}): AsyncIterable<StreamChunk> {
  const { config, protocol, request, timeouts } = input;
  const body = protocol.body(request, true);
  const raw = createRawCapture(new Date(), request.model);
  const abort = createRequestAbort({
    ...toStreamAbortTimeouts(timeouts),
    external: request.signal,
  });
  const state: StreamState = {
    content: '',
    finishReason: 'stop',
    terminal: false,
  };
  const decoder = new TextDecoder('utf-8');
  try {
    const response = await expoFetch(config.endpoint, {
      method: 'POST',
      headers: {
        ...protocol.headers(config.apiKey, config.workspaceId),
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal: abort.signal,
    });
    raw.headers(response.headers);
    if (!response.ok) {
      const text = await response.text();
      raw.append(text);
      throw directProviderError(
        protocol.provider,
        response.status,
        parseErrorBody(text),
        response.headers
      );
    }
    if (!response.body?.getReader) {
      throw new LlmProviderError({
        provider: protocol.provider,
        code: 'invalidRequest',
        message: 'Streaming is unavailable in this runtime.',
        retryable: false,
      });
    }
    const reader = response.body.getReader();
    const parser = new SseParser();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (!done) abort.markActivity(); // Pings and usage events also keep the request alive.
        const text = done
          ? decoder.decode()
          : decoder.decode(value, { stream: true });
        raw.append(text); // Preserve arrival order before parsing any event.
        for (const data of parser.push(text, done)) {
          const chunk = protocol.event(JSON.parse(data), state);
          if (chunk) yield chunk;
        }
        if (done) break;
      }
    } finally {
      reader.releaseLock();
    }
    if (!state.terminal) {
      throw new LlmProviderError({
        provider: protocol.provider,
        code: 'networkError',
        message: 'The stream ended before the response finished.',
        retryable: true,
      });
    }
    yield {
      type: 'done',
      content: state.content,
      usage: state.usage,
      finishReason: state.finishReason,
      rawResponse: await raw.finish(state.model),
    };
  } catch (error) {
    // Flush any incomplete UTF-8 sequence into the capture even on Stop/drop.
    raw.append(decoder.decode());
    if (state.content.trim()) {
      yield {
        type: 'done',
        content: state.content,
        usage: state.usage,
        finishReason: 'error',
        interruptedReason: toInterruptedReason(error, abort.cause()),
        rawResponse: await raw.finish(state.model),
      };
      return;
    }
    throw (
      toAbortedRequestError({
        error,
        abortCause: abort.cause(),
        provider: protocol.provider,
        label: protocol.provider,
      }) ??
      (error instanceof LlmProviderError
        ? error
        : new LlmProviderError({
            provider: protocol.provider,
            code: 'networkError',
            message: `Couldn't read the ${protocol.provider} response. Try again.`,
            retryable: true,
          }))
    );
  } finally {
    abort.dispose();
  }
}
