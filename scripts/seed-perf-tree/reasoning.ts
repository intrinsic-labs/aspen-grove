/**
 * Reasoning models (anthropic/claude-haiku-5.5 among them) think before they
 * answer, and OpenRouter counts those hidden tokens against `max_tokens`
 * (https://openrouter.ai/docs/use-cases/reasoning-tokens): a budget sized for
 * the reply alone comes back cut short, or empty with `finish_reason:
 * "length"`. Reasoning can't be switched off for Claude through
 * chat-completions (`effort: "none"` is rejected), and setting its own
 * budget has a 1024-token floor that would buy more thinking than a short
 * reply needs, so the seed leaves the model's default and adds headroom to
 * `max_tokens` instead. The headroom is a cap, not a cost: only tokens the
 * model spends are billed.
 */
export type ReasoningBudget = {
  /** Added to each call's `max_tokens` on top of the reply's own budget. */
  readonly headroomTokens: number;
  /** Reasoning tokens a call is expected to spend, for the estimate. */
  readonly expectedTokens: number;
};

/** haiku-5.5 spent about 60 reasoning tokens on a seed reply (2026-11-21). */
export const DEFAULT_REASONING_BUDGET: ReasoningBudget = {
  headroomTokens: 1024,
  expectedTokens: 100,
};
