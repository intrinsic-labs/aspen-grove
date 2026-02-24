export const DEFAULT_OPENROUTER_ENDPOINT =
  'https://openrouter.ai/api/v1/chat/completions';
export const DEFAULT_TIMEOUT_MS = 45000;

export type OpenRouterConfig = {
  readonly apiKey: string;
  readonly endpoint: string;
  readonly appName?: string;
  readonly appUrl?: string;
};

export type OpenRouterErrorPayload = {
  readonly error?: {
    readonly message?: string;
    readonly code?: string | number;
    readonly metadata?: Record<string, unknown>;
  };
};

export type OpenRouterToolCall = {
  readonly id?: string;
  readonly type?: string;
  readonly function?: {
    readonly name?: string;
    readonly arguments?: string;
  };
};

export type OpenRouterMessagePayload = {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string | readonly Record<string, unknown>[];
};

export type OpenRouterResponsePayload = {
  readonly id?: string;
  readonly model?: string;
  readonly choices?: Array<{
    readonly finish_reason?: string | null;
    readonly message?: {
      readonly role?: string;
      readonly content?: string | Array<Record<string, unknown>> | null;
      readonly tool_calls?: OpenRouterToolCall[];
    };
  }>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
};

export type OpenRouterStreamingPayload = {
  readonly id?: string;
  readonly model?: string;
  readonly choices?: Array<{
    readonly delta?: {
      readonly role?: string;
      readonly content?: string | Array<Record<string, unknown>> | null;
      readonly tool_calls?: OpenRouterToolCall[];
    };
    readonly finish_reason?: string | null;
  }>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
};

