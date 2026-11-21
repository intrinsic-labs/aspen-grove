/** The parts of an OpenRouter chat completion the seed reads. */
type ChatResponse = {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: {
    completion_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number | null } | null;
  };
};

export type Completion = {
  readonly text: string;
  /** The reply stopped at `max_tokens` (`finish_reason: "length"`). */
  readonly truncated: boolean;
  readonly reasoningTokens: number;
  readonly completionTokens: number;
};

export const readCompletion = (body: unknown): Completion => {
  const response = body as ChatResponse;
  const choice = response.choices?.[0];
  return {
    text: choice?.message?.content?.trim() ? choice.message.content : '',
    truncated: choice?.finish_reason === 'length',
    reasoningTokens:
      response.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
  };
};
