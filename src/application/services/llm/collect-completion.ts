import {
  CompletionRequest,
  CompletionResponse,
  ILlmProvider,
  LlmProviderError,
  type StreamInterruptionReason,
} from './ILlmProvider';
import { isRetryableLlmError, withRetry, type RetryOptions } from './retry';

export type CollectCompletionInput = {
  readonly llmProvider: ILlmProvider;
  readonly request: CompletionRequest;
  readonly stream?: boolean;
  readonly fallbackToNonStreamingOnInvalidRequest?: boolean;
  readonly retry?: RetryOptions;
  readonly onTextDelta?: (input: {
    readonly delta: string;
    readonly content: string;
  }) => void | Promise<void>;
};

const toInterruptedMarker = (reason: StreamInterruptionReason): string =>
  `[stream interrupted: ${reason}]`;

/**
 * Resolves a completion response using streaming or non-streaming execution.
 *
 * When streaming is enabled, the final `CompletionResponse` is assembled from stream chunks.
 *
 * Retryable provider errors (`LlmProviderError.retryable`) are retried with
 * exponential backoff. Streaming attempts are only retried while no chunks
 * have been received yet — once content has streamed, retrying would risk
 * duplicating output, so mid-stream failures are surfaced as-is.
 */
export const collectCompletion = async (
  input: CollectCompletionInput
): Promise<CompletionResponse> => {
  const {
    llmProvider,
    request,
    stream = false,
    fallbackToNonStreamingOnInvalidRequest = true,
    retry,
    onTextDelta,
  } = input;

  if (!stream) {
    return withRetry(() => llmProvider.generateCompletion(request), retry);
  }

  const collectStream = async (
    onChunkReceived: () => void
  ): Promise<CompletionResponse> => {
    let content = '';
    let usage: CompletionResponse['usage'];
    let finishReason: CompletionResponse['finishReason'] = 'error';
    let interruptionReason: StreamInterruptionReason | undefined;
    let rawResponse: CompletionResponse['rawResponse'] | undefined;

    for await (const chunk of llmProvider.generateStreamingCompletion(request)) {
      onChunkReceived();

      if (chunk.type === 'text' && chunk.content) {
        content += chunk.content;
        await onTextDelta?.({
          delta: chunk.content,
          content,
        });
        continue;
      }

      if (chunk.type === 'error') {
        throw new Error(
          chunk.error?.trim() || 'Provider streaming completion failed.'
        );
      }

      if (chunk.type === 'done') {
        usage = chunk.usage;
        finishReason = chunk.finishReason ?? 'stop';
        interruptionReason = chunk.interruptedReason;
        rawResponse = chunk.rawResponse;
        if (chunk.content) {
          content = chunk.content;
        }
      }
    }

    if (!rawResponse) {
      throw new Error('Provider streaming completion ended without final raw response.');
    }

    const persistedContent =
      finishReason === 'error' && interruptionReason && content.trim().length > 0
        ? `${content.trimEnd()}\n\n${toInterruptedMarker(interruptionReason)}`
        : content;

    return {
      content: persistedContent,
      finishReason,
      interruptionReason,
      usage,
      rawResponse,
    };
  };

  try {
    let chunkReceivedThisAttempt = false;
    return await withRetry(
      () => {
        chunkReceivedThisAttempt = false;
        return collectStream(() => {
          chunkReceivedThisAttempt = true;
        });
      },
      {
        ...retry,
        shouldRetry: (error) =>
          !chunkReceivedThisAttempt &&
          (retry?.shouldRetry ?? isRetryableLlmError)(error),
      }
    );
  } catch (error) {
    if (
      fallbackToNonStreamingOnInvalidRequest &&
      error instanceof LlmProviderError &&
      error.code === 'invalidRequest'
    ) {
      return withRetry(() => llmProvider.generateCompletion(request), retry);
    }
    throw error;
  }
};
