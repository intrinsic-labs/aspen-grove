import {
  CompletionResponse,
  ILlmProvider,
  isTextCompletionRequest,
  LlmProviderCredentials,
  LlmProviderError,
  LlmProviderInitializeOptions,
  ProviderCapabilities,
  ProviderRequest,
  StreamChunk,
} from '@application/services/llm';
import { requestOpenRouterCompletion } from './openrouter/completion';
import { toJsonString } from './openrouter/helpers';
import { streamOpenRouterCompletion } from './openrouter/streaming';
import { toOpenRouterTextTransport } from './openrouter/text-transport';
import { requestTextCompletion } from './shared/text-completion-request';
import { streamTextCompletion } from './shared/text-completion-stream';
import type { StreamTimeouts } from './shared/stream-timeouts';
import {
  DEFAULT_OPENROUTER_ENDPOINT,
  DEFAULT_STREAM_TIMEOUTS,
  DEFAULT_TIMEOUT_MS,
  type OpenRouterConfig,
} from './openrouter/types';

/** OpenRouter implementation of `ILlmProvider`. */
export class OpenRouterAdapter implements ILlmProvider {
  readonly provider = 'openrouter' as const;
  private config: OpenRouterConfig | null = null;
  private readonly timeoutMs: number;
  private readonly streamTimeouts: StreamTimeouts;

  /**
   * `timeoutMs` bounds a whole non-streaming completion; `streamTimeouts`
   * a stream's wait for its first bytes, then between chunks.
   */
  constructor(
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
    streamTimeouts: StreamTimeouts = DEFAULT_STREAM_TIMEOUTS
  ) {
    this.timeoutMs = timeoutMs;
    this.streamTimeouts = streamTimeouts;
  }

  async initialize(
    credentials: LlmProviderCredentials,
    options: LlmProviderInitializeOptions = {}
  ): Promise<boolean> {
    const apiKey = credentials.apiKey.trim();
    if (!apiKey) {
      return false;
    }

    this.config = {
      apiKey,
      endpoint: options.endpoint ?? DEFAULT_OPENROUTER_ENDPOINT,
      appName: options.appName?.trim() || undefined,
      appUrl: options.appUrl?.trim() || undefined,
    };

    return true;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsSystemPrompt: false,
      supportedModels: [],
    };
  }

  async generateCompletion(
    request: ProviderRequest
  ): Promise<CompletionResponse> {
    const config = this.requireConfig();
    try {
      return await (isTextCompletionRequest(request)
        ? requestTextCompletion({
            transport: toOpenRouterTextTransport(config),
            request,
            timeoutMs: this.timeoutMs,
          })
        : requestOpenRouterCompletion({
            config,
            request,
            timeoutMs: this.timeoutMs,
          }));
    } catch (error) {
      if (error instanceof LlmProviderError) {
        throw error;
      }
      throw new LlmProviderError({
        code: 'networkError',
        message: `OpenRouter network error: ${toJsonString(error)}`,
        provider: this.provider,
        retryable: true,
      });
    }
  }

  async *generateStreamingCompletion(
    request: ProviderRequest
  ): AsyncIterable<StreamChunk> {
    const config = this.requireConfig();
    try {
      yield* isTextCompletionRequest(request)
        ? streamTextCompletion({
            transport: toOpenRouterTextTransport(config),
            request,
            timeouts: this.streamTimeouts,
          })
        : streamOpenRouterCompletion({
            config,
            request,
            timeouts: this.streamTimeouts,
          });
    } catch (error) {
      if (error instanceof LlmProviderError) {
        throw error;
      }
      throw new LlmProviderError({
        code: 'networkError',
        message: `OpenRouter streaming error: ${toJsonString(error)}`,
        provider: this.provider,
        retryable: true,
      });
    }
  }

  private requireConfig(): OpenRouterConfig {
    if (!this.config) {
      throw new LlmProviderError({
        code: 'authenticationFailed',
        message:
          'OpenRouter adapter is not initialized. Call initialize() with credentials first.',
        provider: this.provider,
        retryable: false,
      });
    }
    return this.config;
  }
}
