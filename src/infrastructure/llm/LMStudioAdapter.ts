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
import { requestLMStudioCompletion } from './lmstudio/completion';
import { toJsonString } from './lmstudio/helpers';
import {
  fetchLMStudioModels,
  loadLMStudioModel,
  unloadLMStudioModel,
} from './lmstudio/models';
import { streamLMStudioCompletion } from './lmstudio/streaming';
import {
  DEFAULT_LMSTUDIO_ENDPOINT,
  DEFAULT_TIMEOUT_MS,
  type LMStudioConfig,
  type LMStudioModel,
} from './lmstudio/types';

export type LMStudioAdapterOptions = {
  readonly useMcpTools?: boolean;
  readonly autoLoadModels?: boolean;
  readonly timeoutMs?: number;
};

/**
 * LM Studio implementation of `ILlmProvider`.
 *
 * Uses LM Studio's native /api/v1/chat endpoint which supports:
 * - Server-side MCP tool execution (configured in LM Studio)
 * - Model loading/unloading
 * - Token stats and performance metrics
 */
export class LMStudioAdapter implements ILlmProvider {
  readonly provider = 'lmstudio' as const;
  private config: LMStudioConfig | null = null;
  private readonly timeoutMs: number;
  private cachedModels: LMStudioModel[] = [];

  constructor(options: LMStudioAdapterOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async initialize(
    credentials: LlmProviderCredentials,
    options: LlmProviderInitializeOptions = {}
  ): Promise<boolean> {
    // LM Studio doesn't always require an API key
    const apiToken = credentials.apiKey?.trim() || undefined;

    // Preserve existing config if already initialized (endpoint, MCP settings, etc.)
    // This allows the settings controller to configure the adapter once,
    // and use cases can re-initialize just to update credentials.
    this.config = {
      endpoint:
        options.endpoint ?? this.config?.endpoint ?? DEFAULT_LMSTUDIO_ENDPOINT,
      apiToken,
      useMcpTools: this.config?.useMcpTools ?? true,
      autoLoadModels: this.config?.autoLoadModels ?? true,
    };

    return true;
  }

  /**
   * Configure LM Studio-specific options after initialization.
   */
  configure(options: {
    readonly useMcpTools?: boolean;
    readonly autoLoadModels?: boolean;
    readonly endpoint?: string;
  }): void {
    if (!this.config) {
      return;
    }

    this.config = {
      ...this.config,
      useMcpTools: options.useMcpTools ?? this.config.useMcpTools,
      autoLoadModels: options.autoLoadModels ?? this.config.autoLoadModels,
      endpoint: options.endpoint ?? this.config.endpoint,
    };
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsSystemPrompt: true,
      supportedModels: this.cachedModels.map((m) => m.id),
    };
  }

  /**
   * Fetch available models from the LM Studio server.
   * Models are sorted with loaded models first.
   */
  async fetchModels(): Promise<LMStudioModel[]> {
    const config = this.requireConfig();
    try {
      this.cachedModels = await fetchLMStudioModels({ config });
      return this.cachedModels;
    } catch (error) {
      if (error instanceof LlmProviderError) {
        throw error;
      }
      throw new LlmProviderError({
        code: 'networkError',
        message: `Failed to fetch models: ${toJsonString(error)}`,
        provider: this.provider,
        retryable: true,
      });
    }
  }

  /**
   * Get cached models without making a network request.
   * Call `fetchModels()` first to populate the cache.
   */
  getCachedModels(): LMStudioModel[] {
    return this.cachedModels;
  }

  /**
   * Load a model into memory on the LM Studio server.
   */
  async loadModel(modelId: string): Promise<void> {
    const config = this.requireConfig();
    await loadLMStudioModel({ config, modelId });

    // Refresh model cache to update states
    await this.fetchModels();
  }

  /**
   * Unload a model from memory on the LM Studio server.
   */
  async unloadModel(modelId: string): Promise<void> {
    const config = this.requireConfig();
    await unloadLMStudioModel({ config, modelId });

    // Refresh model cache to update states
    await this.fetchModels();
  }

  async generateCompletion(
    request: CompletionRequest
  ): Promise<CompletionResponse> {
    const config = this.requireConfig();
    try {
      return await requestLMStudioCompletion({
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
        message: `LM Studio network error: ${toJsonString(error)}`,
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
      yield* streamLMStudioCompletion({
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
        message: `LM Studio streaming error: ${toJsonString(error)}`,
        provider: this.provider,
        retryable: true,
      });
    }
  }

  private requireConfig(): LMStudioConfig {
    if (!this.config) {
      throw new LlmProviderError({
        code: 'authenticationFailed',
        message:
          'LM Studio adapter is not initialized. Call initialize() first.',
        provider: this.provider,
        retryable: false,
      });
    }
    return this.config;
  }
}
