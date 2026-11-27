import type {
  CompletionResponse,
  TextCompletionRequest,
} from '@application/services/llm';
import { LlmProviderError } from '@application/services/llm';
import { fetch as expoFetch } from 'expo/fetch';
import {
  buildTextCompletionBody,
  decodeCompletionBody,
  toInBandError,
} from './completion-wire';
import { toAbortedRequestError } from './interruption';
import { createRawCapture } from './raw-capture';
import { createRequestAbort } from './request-abort';
import type { TextTransport } from './text-transport';

/**
 * One non-streaming text completion. The capture is hashed from the body as
 * received, before it is parsed; the text is returned exactly as sent.
 */
export const requestTextCompletion = async (input: {
  readonly transport: TextTransport;
  readonly request: TextCompletionRequest;
  readonly timeoutMs: number;
}): Promise<CompletionResponse> => {
  const { transport, request, timeoutMs } = input;
  const raw = createRawCapture(new Date(), request.model);
  const abort = createRequestAbort({ timeoutMs, external: request.signal });
  try {
    const response = await expoFetch(transport.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...transport.headers },
      body: JSON.stringify(buildTextCompletionBody(request, { stream: false })),
      signal: abort.signal,
    });
    const responseBody = await response.text();
    raw.headers(response.headers);
    raw.append(responseBody);
    const capture = await raw.finish();

    if (!response.ok) {
      throw transport.toError({
        status: response.status,
        responseHeaders: response.headers,
        responseBody,
        fallbackMessage: `${transport.label} request failed (${response.status})`,
      });
    }
    const decoded = decodeCompletionBody(responseBody);
    if (decoded.error) {
      throw toInBandError(transport, decoded.error);
    }
    return {
      content: decoded.text,
      finishReason: decoded.finishReason ?? 'stop',
      usage: decoded.usage,
      rawResponse: {
        ...capture,
        modelIdentifier: decoded.model ?? request.model,
      },
    };
  } catch (error) {
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
            message: `${transport.label} network error: ${String(error)}`,
            provider: transport.provider,
            retryable: true,
          }))
    );
  } finally {
    abort.dispose();
  }
};
