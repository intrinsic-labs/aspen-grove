import {
  LlmProviderError,
  type ILlmProvider,
  type LlmProviderCredentials,
  type LlmProviderInitializeOptions,
  isTextCompletionRequest,
  type CompletionRequest,
  type CompletionResponse,
  type ProviderRequest,
  type StreamChunk,
  type OpenRouterCatalogModel,
} from '@application/services/llm';
import type { StreamTimeouts } from '../shared/stream-timeouts';
import { requestDirectCompletion } from './completion';
import { streamDirectCompletion } from './streaming';
import { fetchDirectCatalog } from './catalog';
import { invalidDirectRequest } from './errors';
import type { DirectConfig, DirectProtocol } from './types';

/** Shared mobile transport lifecycle; each provider owns its wire protocol. */
export class DirectTextAdapter implements ILlmProvider {
  readonly provider;
  private config: DirectConfig | null = null;
  private cachedModels: readonly OpenRouterCatalogModel[] = [];

  constructor(
    private readonly protocol: DirectProtocol,
    private readonly timeoutMs = 45_000,
    private readonly streamTimeouts: StreamTimeouts = {
      firstByteMs: 45_000,
      idleMs: 45_000,
    }
  ) {
    this.provider = protocol.provider;
  }

  async initialize(
    credentials: LlmProviderCredentials,
    options: LlmProviderInitializeOptions = {}
  ): Promise<boolean> {
    const apiKey = credentials.apiKey.trim();
    if (!apiKey) {
      this.config = null;
      this.cachedModels = [];
      return false;
    }
    const endpoint =
      options.endpoint ?? this.config?.endpoint ?? this.protocol.endpoint;
    const workspaceId =
      options.workspaceId?.trim() ||
      (this.config?.apiKey === apiKey ? this.config.workspaceId : undefined);
    if (
      this.config?.apiKey !== apiKey ||
      this.config?.endpoint !== endpoint ||
      this.config?.workspaceId !== workspaceId
    ) {
      this.cachedModels = [];
      this.config = { apiKey, endpoint, workspaceId };
    }
    return true;
  }

  getCapabilities() {
    return {
      supportsStreaming: true,
      supportsSystemPrompt: true,
      supportedModels: this.cachedModels.map((model) => model.id),
    };
  }

  async generateCompletion(
    request: ProviderRequest
  ): Promise<CompletionResponse> {
    this.rejectTextRequest(request);
    return requestDirectCompletion({
      config: this.requireConfig(),
      protocol: this.protocol,
      request,
      timeoutMs: this.timeoutMs,
    });
  }

  async *generateStreamingCompletion(
    request: ProviderRequest
  ): AsyncIterable<StreamChunk> {
    this.rejectTextRequest(request);
    yield* streamDirectCompletion({
      config: this.requireConfig(),
      protocol: this.protocol,
      request,
      timeouts: this.streamTimeouts,
    });
  }

  async fetchModels(options?: {
    signal?: AbortSignal;
  }): Promise<readonly OpenRouterCatalogModel[]> {
    const config = this.requireConfig();
    const models = await fetchDirectCatalog({
      config,
      protocol: this.protocol,
      timeoutMs: 15_000,
      signal: options?.signal,
    });
    // A key change during discovery must not restore the previous key's cache.
    if (this.config === config) this.cachedModels = models;
    return models;
  }

  getCachedModels(): readonly OpenRouterCatalogModel[] {
    return this.cachedModels;
  }

  /** Hosted chat providers don't serve base models here. */
  private rejectTextRequest(
    request: ProviderRequest
  ): asserts request is CompletionRequest {
    if (isTextCompletionRequest(request)) {
      throw invalidDirectRequest(
        this.protocol.provider,
        'This connection serves chat models only. Base models need OpenRouter or LM Studio.'
      );
    }
  }

  private requireConfig(): DirectConfig {
    if (!this.config)
      throw new LlmProviderError({
        provider: this.provider,
        code: 'authenticationFailed',
        message: 'Add an API key in Connections first.',
        retryable: false,
      });
    return this.config;
  }
}
