import type { StreamTimeouts } from '../shared/stream-timeouts';

export const DEFAULT_OPENROUTER_ENDPOINT =
  'https://openrouter.ai/api/v1/chat/completions';
/** A whole non-streaming completion. */
export const DEFAULT_TIMEOUT_MS = 45000;
/**
 * A stream: 45 s for the first bytes, then 45 s of silence between chunks.
 * OpenRouter sends SSE comments while a model is still thinking, and they
 * count as activity, so a reasoning model's quiet stretch isn't cut off.
 */
export const DEFAULT_STREAM_TIMEOUTS: StreamTimeouts = {
  firstByteMs: 45_000,
  idleMs: 45_000,
};

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
    };
    readonly finish_reason?: string | null;
  }>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
};

