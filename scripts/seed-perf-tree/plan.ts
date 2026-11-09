import { createHash } from 'node:crypto';
import { HUMAN_PROMPTS } from './prompts.ts';
import { createRng } from './rng.ts';
import type { ShapeNode } from './shape.ts';

export type PlanNode = ShapeNode & {
  /** Human turns: the prompt text. Model turns: empty until filled. */
  readonly humanText: string;
  /**
   * Cache key. Chains the parent's key with this node's own recipe, so it
   * is known before anything is generated and changes if any ancestor does.
   */
  readonly key: string;
};

/** Assigns human text and cache keys to a shape. Pure and deterministic. */
export const buildPlan = (
  shape: readonly ShapeNode[],
  seed: number,
  model: string
): PlanNode[] => {
  const rng = createRng(seed ^ 0x9e3779b9);
  const plan: PlanNode[] = [];
  for (const node of shape) {
    const humanText = node.role === 'human' ? rng.pick(HUMAN_PROMPTS) : '';
    const parentKey = node.parent === null ? model : plan[node.parent].key;
    const recipe = `${parentKey}|${node.index}|${node.role}|${node.targetTokens}|${humanText}`;
    plan.push({
      ...node,
      humanText,
      key: createHash('sha256').update(recipe).digest('hex').slice(0, 32),
    });
  }
  return plan;
};

/** Ancestors from the root down to (and including) the node. */
export const pathTo = (
  plan: readonly PlanNode[],
  index: number
): PlanNode[] => {
  const chain: PlanNode[] = [];
  for (let cursor: number | null = index; cursor !== null; ) {
    chain.unshift(plan[cursor]);
    cursor = plan[cursor].parent;
  }
  return chain;
};
