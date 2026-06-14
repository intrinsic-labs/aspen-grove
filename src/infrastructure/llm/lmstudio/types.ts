export const DEFAULT_LMSTUDIO_ENDPOINT = 'http://localhost:1234';
export const DEFAULT_TIMEOUT_MS = 60000;

export type LMStudioConfig = {
  readonly endpoint: string;
  readonly apiToken?: string;
  readonly useMcpTools: boolean;
  readonly autoLoadModels: boolean;
};

export type LMStudioModelState = 'loaded' | 'not-loaded';

/**
 * Raw model data from LM Studio API response.
 * The API returns models with 'key' as the identifier.
 */
export type LMStudioApiModel = {
  readonly type: 'llm' | 'embedding';
  readonly publisher: string;
  readonly key: string;
  readonly display_name: string;
  readonly architecture?: string | null;
  readonly quantization?: {
    readonly name?: string | null;
    readonly bits_per_weight?: number | null;
  } | null;
  readonly size_bytes: number;
  readonly params_string?: string | null;
  readonly loaded_instances: readonly {
    readonly id: string;
    readonly config?: {
      readonly context_length?: number;
    };
  }[];
  readonly max_context_length: number;
  readonly format?: 'gguf' | 'mlx' | null;
  readonly capabilities?: {
    readonly vision?: boolean;
    readonly trained_for_tool_use?: boolean;
  };
  readonly description?: string | null;
};

/**
 * Normalized model representation used in the app.
 */
export type LMStudioModel = {
  readonly id: string;
  readonly displayName: string;
  readonly type: 'llm' | 'embedding';
  readonly state: LMStudioModelState;
  readonly maxContextLength: number;
  readonly architecture?: string;
  readonly paramsString?: string;
  readonly sizeBytes: number;
};

export type LMStudioModelsResponse = {
  readonly models: LMStudioApiModel[];
};

export type LMStudioMessagePayload = {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string | readonly Record<string, unknown>[];
};

export type LMStudioToolCall = {
  readonly id?: string;
  readonly type?: string;
  readonly function?: {
    readonly name?: string;
    readonly arguments?: string;
  };
};

export type LMStudioStats = {
  readonly tokens_per_second?: number;
  readonly time_to_first_token?: number;
  readonly generation_time?: number;
  readonly prompt_tokens?: number;
  readonly completion_tokens?: number;
  readonly total_tokens?: number;
};

export type LMStudioResponsePayload = {
  readonly id?: string;
  readonly model?: string;
  readonly choices?: Array<{
    readonly finish_reason?: string | null;
    readonly message?: {
      readonly role?: string;
      readonly content?: string | Array<Record<string, unknown>> | null;
      readonly tool_calls?: LMStudioToolCall[];
    };
  }>;
  readonly stats?: LMStudioStats;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
};

export type LMStudioStreamingPayload = {
  readonly id?: string;
  readonly model?: string;
  readonly choices?: Array<{
    readonly delta?: {
      readonly role?: string;
      readonly content?: string | Array<Record<string, unknown>> | null;
      readonly tool_calls?: LMStudioToolCall[];
    };
    readonly finish_reason?: string | null;
  }>;
  readonly stats?: LMStudioStats;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
};

export type LMStudioErrorPayload = {
  readonly error?: {
    readonly message?: string;
    readonly code?: string | number;
    readonly type?: string;
  };
};
