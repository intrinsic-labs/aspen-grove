import type { Provider } from '@domain/entities';
import type { ContentHash } from '@domain/value-objects';

export type ProviderCapabilities = {
  readonly supportsStreaming: boolean;
  readonly supportsSystemPrompt: boolean;
  readonly supportedModels: readonly string[];
};

export type MessageRole = 'user' | 'assistant' | 'system';

export type TextBlock = {
  readonly type: 'text';
  readonly text: string;
};

export type ImageSource = {
  readonly type: 'base64' | 'url';
  readonly mediaType: string;
  readonly data: string;
};

export type ImageBlock = {
  readonly type: 'image';
  readonly source: ImageSource;
};

export type MessageContent = string | readonly (TextBlock | ImageBlock)[];

export type Message = {
  readonly role: MessageRole;
  readonly content: MessageContent;
};

export type ToolDefinition = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
};

export type ToolCall = {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
};

export type TokenUsage = {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
};

export type CompletionRequest = {
  readonly messages: readonly Message[];
  readonly model: string;
  readonly systemPrompt?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly stopSequences?: readonly string[];
  readonly tools?: readonly ToolDefinition[];
};

export type RawResponseCapture = {
  readonly rawBytes: string;
  readonly rawBytesHash: ContentHash;
  readonly requestTimestamp: Date;
  readonly responseTimestamp: Date;
  readonly latencyMs: number;
  readonly requestId?: string;
  readonly modelIdentifier?: string;
  readonly responseBody: string;
  readonly responseHeaders: string;
};

export type CompletionResponse = {
  readonly content: string;
  readonly finishReason: 'stop' | 'length' | 'toolUse' | 'error';
  readonly usage?: TokenUsage;
  readonly toolCalls?: readonly ToolCall[];
  readonly rawResponse: RawResponseCapture;
};

export type StreamChunk = {
  readonly type:
    | 'text'
    | 'toolCallStart'
    | 'toolCallDelta'
    | 'toolCallEnd'
    | 'done'
    | 'error';
  readonly content?: string;
  readonly toolCall?: Partial<ToolCall>;
  readonly usage?: TokenUsage;
  readonly rawResponse?: RawResponseCapture;
  readonly error?: string;
};

export type LlmProviderCredentials = {
  readonly apiKey: string;
};

export type LlmProviderInitializeOptions = {
  readonly endpoint?: string;
  readonly appName?: string;
  readonly appUrl?: string;
};

export type LlmProviderErrorCode =
  | 'authenticationFailed'
  | 'rateLimited'
  | 'contextTooLong'
  | 'modelNotFound'
  | 'invalidRequest'
  | 'serverError'
  | 'networkError'
  | 'timeout'
  | 'contentFiltered'
  | 'unknown';

export class LlmProviderError extends Error {
  readonly code: LlmProviderErrorCode;
  readonly provider: Provider;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;

  constructor(input: {
    readonly code: LlmProviderErrorCode;
    readonly message: string;
    readonly provider: Provider;
    readonly retryable: boolean;
    readonly retryAfterMs?: number;
  }) {
    super(input.message);
    this.name = 'LlmProviderError';
    this.code = input.code;
    this.provider = input.provider;
    this.retryable = input.retryable;
    this.retryAfterMs = input.retryAfterMs;
  }
}

/**
 * App-layer contract for provider adapters (OpenRouter/OpenAI/etc).
 */
export interface ILlmProvider {
  readonly provider: Provider;
  initialize(
    credentials: LlmProviderCredentials,
    options?: LlmProviderInitializeOptions
  ): Promise<boolean>;
  getCapabilities(): ProviderCapabilities;
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  generateStreamingCompletion(
    request: CompletionRequest
  ): AsyncIterable<StreamChunk>;
}
