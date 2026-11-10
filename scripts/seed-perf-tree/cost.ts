import type { ReplyCache } from './cache.ts';
import { pathTo, type PlanNode } from './plan.ts';
import { systemFor } from './fill.ts';

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
  readonly outputTokens: number;
  readonly usd: number;
};

const tokensOf = (text: string) => Math.ceil(text.length / CHARS_PER_TOKEN);

/**
 * Estimates the spend of the calls that are not yet cached. A reply is
 * assumed to be about its target length; each call re-sends its whole path.
 */
export const estimateCost = (
  plan: readonly PlanNode[],
  cache: ReplyCache | undefined,
  pricing: Pricing
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
  const usd =
    (inputTokens * pricing.inputPerM + outputTokens * pricing.outputPerM) / 1e6;
  return { calls, cachedCalls, inputTokens, outputTokens, usd };
};
