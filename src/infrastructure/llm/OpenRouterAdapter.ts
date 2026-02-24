import {
  CompletionRequest,
  CompletionResponse,
  ILlmProvider,
  LlmProviderCredentials,
  LlmProviderError,
  LlmProviderInitializeOptions,
  ProviderCapabilities,
  StreamChunk,
} from '@application/services/llm';
import { requestOpenRouterCompletion } from './openrouter/completion';
import { toJsonString } from './openrouter/helpers';
import { streamOpenRouterCompletion } from './openrouter/streaming';
import {
  DEFAULT_OPENROUTER_ENDPOINT,
  DEFAULT_TIMEOUT_MS,
  type OpenRouterConfig,
} from './openrouter/types';

/** OpenRouter implementation of `ILlmProvider`. */
export class OpenRouterAdapter implements ILlmProvider {
  readonly provider = 'openrouter' as const;
  private config: OpenRouterConfig | null = null;
  private readonly timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
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

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const config = this.requireConfig();
    try {
      return await requestOpenRouterCompletion({
        config,
        request,
        timeoutMs: this.timeoutMs,
      });
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
    request: CompletionRequest
  ): AsyncIterable<StreamChunk> {
    const config = this.requireConfig();
    try {
      yield* streamOpenRouterCompletion({
        config,
        request,
        timeoutMs: this.timeoutMs,
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

