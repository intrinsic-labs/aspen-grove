import { computeSha256Hash } from '@application/services/content-hash-service';
import {
  CompletionRequest,
  CompletionResponse,
  ILlmProvider,
  LlmProviderCredentials,
  LlmProviderError,
  LlmProviderInitializeOptions,
  Message,
  ProviderCapabilities,
  StreamChunk,
  ToolCall,
} from '@application/services/llm';

const DEFAULT_OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 45000;

type OpenRouterConfig = {
  apiKey: string;
  endpoint: string;
  appName?: string;
  appUrl?: string;
};

type OpenRouterErrorPayload = {
  error?: {
    message?: string;
    code?: string | number;
    metadata?: Record<string, unknown>;
  };
};

type OpenRouterMessagePayload = {
  role: 'system' | 'user' | 'assistant';
  content: string | readonly Record<string, unknown>[];
};

type OpenRouterToolCall = {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

type OpenRouterResponsePayload = {
  id?: string;
  model?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      role?: string;
      content?: string | Array<Record<string, unknown>> | null;
      tool_calls?: OpenRouterToolCall[];
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

const toJsonString = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const headersToString = (headers: Headers): string => {
  const lines: string[] = [];
  headers.forEach((value, key) => {
    lines.push(`${key}: ${value}`);
  });
  lines.sort((a, b) => a.localeCompare(b));
  return lines.join('\n');
};

const parseRetryAfterMs = (headers: Headers): number | undefined => {
  const retryAfter = headers.get('retry-after');
  if (!retryAfter) {
    return undefined;
  }

  const seconds = Number(retryAfter);
  if (!Number.isNaN(seconds)) {
    return Math.max(0, Math.round(seconds * 1000));
  }

  const date = new Date(retryAfter);
  if (!Number.isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return undefined;
};

const toOpenRouterContent = (message: Message): OpenRouterMessagePayload['content'] => {
  if (typeof message.content === 'string') {
    return message.content;
  }

  return message.content.map((block) => {
    if (block.type === 'text') {
      return {
        type: 'text',
        text: block.text,
      };
    }

    if (block.source.type === 'url') {
      return {
        type: 'image_url',
        image_url: { url: block.source.data },
      };
    }

    const dataUrl = `data:${block.source.mediaType};base64,${block.source.data}`;
    return {
      type: 'image_url',
      image_url: { url: dataUrl },
    };
  });
};

const toOpenRouterMessages = (
  messages: readonly Message[],
  systemPrompt?: string
): OpenRouterMessagePayload[] => {
  const next: OpenRouterMessagePayload[] = [];
  const trimmedSystem = systemPrompt?.trim();
  if (trimmedSystem) {
    next.push({
      role: 'system',
      content: trimmedSystem,
    });
  }

  for (const message of messages) {
    next.push({
      role: message.role,
      content: toOpenRouterContent(message),
    });
  }

  return next;
};

const parseToolCallArguments = (raw?: string): Record<string, unknown> => {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
};

const toToolCalls = (toolCalls: OpenRouterToolCall[] | undefined): ToolCall[] | undefined => {
  if (!toolCalls || toolCalls.length === 0) {
    return undefined;
  }

  const mapped = toolCalls
    .map((toolCall, index) => {
      const name = toolCall.function?.name;
      if (!name) {
        return null;
      }

      return {
        id: toolCall.id ?? `tool-call-${index}`,
        name,
        arguments: parseToolCallArguments(toolCall.function?.arguments),
      };
    })
    .filter((toolCall): toolCall is ToolCall => Boolean(toolCall));

  return mapped.length > 0 ? mapped : undefined;
};

const toCompletionText = (
  content: string | Array<Record<string, unknown>> | null | undefined
): string => {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  return content
    .map((chunk) => {
      const text = chunk['text'];
      return typeof text === 'string' ? text : '';
    })
    .filter(Boolean)
    .join('');
};

const toFinishReason = (
  finishReason: string | null | undefined
): CompletionResponse['finishReason'] => {
  switch (finishReason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'tool_calls':
      return 'toolUse';
    default:
      return 'error';
  }
};

const toLlmProviderError = (input: {
  status?: number;
  responseHeaders?: Headers;
  responseBody?: string;
  fallbackMessage: string;
}): LlmProviderError => {
  const { status, responseHeaders, responseBody, fallbackMessage } = input;

  let parsedError: OpenRouterErrorPayload | null = null;
  if (responseBody) {
    try {
      parsedError = JSON.parse(responseBody) as OpenRouterErrorPayload;
    } catch {
      parsedError = null;
    }
  }

  const message =
    parsedError?.error?.message ??
    (responseBody && responseBody.trim().length > 0 ? responseBody : fallbackMessage);

  if (status === 401 || status === 403) {
    return new LlmProviderError({
      code: 'authenticationFailed',
      message,
      provider: 'openrouter',
      retryable: false,
    });
  }

  if (status === 404) {
    return new LlmProviderError({
      code: 'modelNotFound',
      message,
      provider: 'openrouter',
      retryable: false,
    });
  }

  if (status === 408) {
    return new LlmProviderError({
      code: 'timeout',
      message,
      provider: 'openrouter',
      retryable: true,
    });
  }

  if (status === 413) {
    return new LlmProviderError({
      code: 'contextTooLong',
      message,
      provider: 'openrouter',
      retryable: false,
    });
  }

  if (status === 422 || status === 400) {
    return new LlmProviderError({
      code: 'invalidRequest',
      message,
      provider: 'openrouter',
      retryable: false,
    });
  }

  if (status === 429) {
    return new LlmProviderError({
      code: 'rateLimited',
      message,
      provider: 'openrouter',
      retryable: true,
      retryAfterMs: responseHeaders ? parseRetryAfterMs(responseHeaders) : undefined,
    });
  }

  if (status === 451) {
    return new LlmProviderError({
      code: 'contentFiltered',
      message,
      provider: 'openrouter',
      retryable: false,
    });
  }

  if (status !== undefined && status >= 500) {
    return new LlmProviderError({
      code: 'serverError',
      message,
      provider: 'openrouter',
      retryable: true,
    });
  }

  return new LlmProviderError({
    code: 'unknown',
    message,
    provider: 'openrouter',
    retryable: false,
  });
};

/** OpenRouter implementation of `ILlmProvider` (non-streaming for MVP). */
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
      supportsStreaming: false,
      supportsSystemPrompt: false,
      supportedModels: [],
    };
  }

  async generateCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    const config = this.config;
    if (!config) {
      throw new LlmProviderError({
        code: 'authenticationFailed',
        message:
          'OpenRouter adapter is not initialized. Call initialize() with credentials first.',
        provider: this.provider,
        retryable: false,
      });
    }

    const requestTimestamp = new Date();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const body = {
        model: request.model,
        messages: toOpenRouterMessages(request.messages, request.systemPrompt),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stop: request.stopSequences,
        tools: request.tools?.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        })),
        stream: false,
      };

      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      };

      if (config.appUrl) {
        headers['HTTP-Referer'] = config.appUrl;
      }
      if (config.appName) {
        headers['X-Title'] = config.appName;
      }

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const responseBody = await response.text();
      const responseTimestamp = new Date();
      const latencyMs = responseTimestamp.getTime() - requestTimestamp.getTime();

      const responseHeaders = headersToString(response.headers);
      const rawBytes = `${responseHeaders}\n\n${responseBody}`;
      const rawBytesHash = await computeSha256Hash(rawBytes);

      if (!response.ok) {
        throw toLlmProviderError({
          status: response.status,
          responseHeaders: response.headers,
          responseBody,
          fallbackMessage: `OpenRouter request failed (${response.status})`,
        });
      }

      const payload = JSON.parse(responseBody) as OpenRouterResponsePayload;
      const choice = payload.choices?.[0];
      const completionText = toCompletionText(choice?.message?.content);

      return {
        content: completionText,
        finishReason: toFinishReason(choice?.finish_reason),
        usage: payload.usage
          ? {
              promptTokens: payload.usage.prompt_tokens ?? 0,
              completionTokens: payload.usage.completion_tokens ?? 0,
              totalTokens:
                payload.usage.total_tokens ??
                (payload.usage.prompt_tokens ?? 0) +
                  (payload.usage.completion_tokens ?? 0),
            }
          : undefined,
        toolCalls: toToolCalls(choice?.message?.tool_calls),
        rawResponse: {
          rawBytes,
          rawBytesHash,
          requestTimestamp,
          responseTimestamp,
          latencyMs,
          requestId:
            response.headers.get('x-request-id') ??
            response.headers.get('request-id') ??
            undefined,
          modelIdentifier: payload.model,
          responseBody,
          responseHeaders,
        },
      };
    } catch (error) {
      if (error instanceof LlmProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new LlmProviderError({
          code: 'timeout',
          message: 'OpenRouter request timed out.',
          provider: this.provider,
          retryable: true,
        });
      }

      throw new LlmProviderError({
        code: 'networkError',
        message: `OpenRouter network error: ${toJsonString(error)}`,
        provider: this.provider,
        retryable: true,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async *generateStreamingCompletion(
    request: CompletionRequest
  ): AsyncIterable<StreamChunk> {
    void request;
    throw new LlmProviderError({
      code: 'invalidRequest',
      message: 'OpenRouter streaming adapter is not implemented yet.',
      provider: this.provider,
      retryable: false,
    });
  }
}
