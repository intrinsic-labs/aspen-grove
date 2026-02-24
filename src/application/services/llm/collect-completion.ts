import {
  CompletionRequest,
  CompletionResponse,
  ILlmProvider,
  LlmProviderError,
} from './ILlmProvider';

export type CollectCompletionInput = {
  readonly llmProvider: ILlmProvider;
  readonly request: CompletionRequest;
  readonly stream?: boolean;
  readonly fallbackToNonStreamingOnInvalidRequest?: boolean;
  readonly onTextDelta?: (input: {
    readonly delta: string;
    readonly content: string;
  }) => void | Promise<void>;
};

/**
 * Resolves a completion response using streaming or non-streaming execution.
 *
 * When streaming is enabled, the final `CompletionResponse` is assembled from stream chunks.
 */
export const collectCompletion = async (
  input: CollectCompletionInput
): Promise<CompletionResponse> => {
  const {
    llmProvider,
    request,
    stream = false,
    fallbackToNonStreamingOnInvalidRequest = true,
    onTextDelta,
  } = input;

  if (!stream) {
    return llmProvider.generateCompletion(request);
  }

  try {
    let content = '';
    let usage: CompletionResponse['usage'];
    let finishReason: CompletionResponse['finishReason'] = 'error';
    let rawResponse: CompletionResponse['rawResponse'] | undefined;

    for await (const chunk of llmProvider.generateStreamingCompletion(request)) {
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
        rawResponse = chunk.rawResponse;
        if (chunk.content) {
          content = chunk.content;
        }
      }
    }

    if (!rawResponse) {
      throw new Error('Provider streaming completion ended without final raw response.');
    }

    return {
      content,
      finishReason,
      usage,
      rawResponse,
    };
  } catch (error) {
    if (
      fallbackToNonStreamingOnInvalidRequest &&
      error instanceof LlmProviderError &&
      error.code === 'invalidRequest'
    ) {
      return llmProvider.generateCompletion(request);
    }
    throw error;
  }
};

