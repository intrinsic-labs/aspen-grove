import { SYSTEM_PROMPT } from './prompts.ts';
import { pathTo, type PlanNode } from './plan.ts';
import type { ReplyCache } from './cache.ts';
import type { ChatMessage, Completer } from './types.ts';

export const systemFor = (targetTokens: number): string =>
  `${SYSTEM_PROMPT} Aim for roughly ${Math.round(targetTokens * 0.75)} words.`;

/** Chat messages for a model node: its ancestors alternate user/assistant. */
export const messagesFor = (
  plan: readonly PlanNode[],
  index: number,
  texts: ReadonlyMap<number, string>
): ChatMessage[] => {
  const ancestors = pathTo(plan, index).slice(0, -1);
  return [
    { role: 'system', content: systemFor(plan[index].targetTokens) },
    ...ancestors.map((node) => ({
      role: node.role === 'human' ? ('user' as const) : ('assistant' as const),
      content: texts.get(node.index) ?? '',
    })),
  ];
};

export type FillOptions = {
  readonly plan: readonly PlanNode[];
  readonly seed: number;
  readonly complete: Completer;
  readonly cache?: ReplyCache;
  readonly concurrency: number;
  readonly onProgress?: (done: number, total: number) => void;
};

/**
 * Resolves the text of every node. A node becomes ready once its parent has
 * text; at most `concurrency` model calls run at once. Replies already in the
 * cache are reused, and each fresh reply is cached as soon as it arrives, so
 * a crashed run resumes where it stopped.
 */
export const fillTree = async (
  options: FillOptions
): Promise<Map<number, string>> => {
  const { plan, complete, cache, concurrency } = options;
  const texts = new Map<number, string>();
  const children = new Map<number, number[]>();
  for (const node of plan) {
    if (node.parent !== null) {
      children.set(node.parent, [
        ...(children.get(node.parent) ?? []),
        node.index,
      ]);
    }
  }
  const total = plan.filter((node) => node.role === 'model').length;
  let done = 0;
  let inFlight = 0;
  let failure: unknown = null;
  const ready: number[] = [0];
  const wakeups: Array<() => void> = [];
  const wakeAll = () => wakeups.splice(0).forEach((wake) => wake());

  const resolveNode = async (index: number) => {
    const node = plan[index];
    if (node.role === 'human') {
      texts.set(index, node.humanText);
      return;
    }
    const cached = cache?.get(node.key);
    if (cached !== undefined) {
      texts.set(index, cached);
    } else {
      const text = await complete({
        messages: messagesFor(plan, index, texts),
        maxTokens: node.targetTokens * 2,
        key: node.key,
        seed: options.seed,
        targetTokens: node.targetTokens,
      });
      cache?.set(node.key, text);
      texts.set(index, text);
    }
    options.onProgress?.(++done, total);
  };

  const worker = async () => {
    for (;;) {
      if (failure) {
        return;
      }
      const index = ready.shift();
      if (index === undefined) {
        if (inFlight === 0) {
          return;
        }
        await new Promise<void>((resolve) => wakeups.push(resolve));
        continue;
      }
      inFlight++;
      try {
        await resolveNode(index);
        ready.push(...(children.get(index) ?? []));
      } catch (error) {
        failure = error;
      } finally {
        inFlight--;
        wakeAll();
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  if (failure) {
    throw failure;
  }
  return texts;
};
