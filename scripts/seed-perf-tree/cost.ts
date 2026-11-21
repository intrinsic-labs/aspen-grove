import type { ReplyCache } from './cache.ts';
import { pathTo, type PlanNode } from './plan.ts';
import { systemFor } from './fill.ts';
import type { ReasoningBudget } from './reasoning.ts';

export const CHARS_PER_TOKEN = 4;

export type Pricing = {
  /** USD per million tokens. */
  readonly inputPerM: number;
  readonly outputPerM: number;
};

export type CostEstimate = {
  readonly calls: number;
  readonly cachedCalls: number;
  readonly inputTokens: number;
  /** Visible reply tokens plus the reasoning expected on top. */
  readonly outputTokens: number;
  /** The reasoning part of `outputTokens` (billed as output). */
  readonly reasoningTokens: number;
  readonly usd: number;
  /** The spend if every call used its whole reasoning headroom. */
  readonly maxUsd: number;
};

const tokensOf = (text: string) => Math.ceil(text.length / CHARS_PER_TOKEN);

/**
 * Estimates the spend of the calls that are not yet cached. A reply is
 * assumed to be about its target length, plus the reasoning a reasoning
 * model spends first (billed as output); each call re-sends its whole path.
 */
export const estimateCost = (
  plan: readonly PlanNode[],
  cache: ReplyCache | undefined,
  pricing: Pricing,
  reasoning: ReasoningBudget
): CostEstimate => {
  const expected = (node: PlanNode) =>
    node.role === 'human' ? tokensOf(node.humanText) : node.targetTokens;
  let calls = 0;
  let cachedCalls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const node of plan) {
    if (node.role !== 'model') {
      continue;
    }
    if (cache?.get(node.key) !== undefined) {
      cachedCalls++;
      continue;
    }
    calls++;
    outputTokens += node.targetTokens;
    inputTokens += tokensOf(systemFor(node.targetTokens));
    for (const ancestor of pathTo(plan, node.index).slice(0, -1)) {
      inputTokens += expected(ancestor) + 4;
    }
  }
  const reasoningTokens = calls * reasoning.expectedTokens;
  const spend = (output: number) =>
    (inputTokens * pricing.inputPerM + output * pricing.outputPerM) / 1e6;
  return {
    calls,
    cachedCalls,
    inputTokens,
    outputTokens: outputTokens + reasoningTokens,
    reasoningTokens,
    usd: spend(outputTokens + reasoningTokens),
    maxUsd: spend(outputTokens + calls * reasoning.headroomTokens),
  };
};
