import { fetch as expoFetch } from 'expo/fetch';
import {
  LlmProviderError,
  type CompletionRequest,
  type CompletionResponse,
} from '@application/services/llm';
import { createRequestAbort } from '../shared/request-abort';
import { toAbortedRequestError } from '../shared/interruption';
import { directProviderError, parseErrorBody } from './errors';
import { createDirectRawCapture } from './raw-capture';
import type { DirectConfig, DirectProtocol } from './types';

export const requestDirectCompletion = async (input: {
  config: DirectConfig;
  protocol: DirectProtocol;
  request: CompletionRequest;
  timeoutMs: number;
}): Promise<CompletionResponse> => {
  const { config, protocol, request, timeoutMs } = input;
  const body = protocol.body(request, false);
  const raw = createDirectRawCapture(new Date(), request.model);
  const abort = createRequestAbort({ timeoutMs, external: request.signal });
  try {
    const response = await expoFetch(config.endpoint, {
      method: 'POST',
      headers: protocol.headers(config.apiKey, config.workspaceId),
      body: JSON.stringify(body),
      signal: abort.signal,
    });
    raw.headers(response.headers);
    const text = await response.text();
    raw.append(text);
    const capture = await raw.finish(); // Hash before parsing the JSON.
    if (!response.ok)
      throw directProviderError(
        protocol.provider,
        response.status,
        parseErrorBody(text),
        response.headers
      );
    const { model, ...completion } = protocol.completion(JSON.parse(text));
    return {
      ...completion,
      rawResponse: { ...capture, modelIdentifier: model ?? request.model },
    };
  } catch (error) {
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
};
