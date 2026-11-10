import { fakeReply } from './fake-text.ts';
import { buildDocument } from './document.ts';
import { fillTree } from './fill.ts';
import { buildPlan } from './plan.ts';
import { buildShape } from './shape.ts';
import type { ReplyCache } from './cache.ts';
import type { OpenLoomDocument } from '../../src/application/services/open-loom/format.ts';
import type { Completer } from './types.ts';

export type GenerateOptions = {
  readonly seed: number;
  readonly nodes: number;
  readonly depth: number;
  readonly model: string;
  readonly concurrency: number;
  /** Model replies come from here: the network, or the offline fake. */
  readonly complete: Completer;
  readonly cache?: ReplyCache;
  readonly label: string;
  readonly onProgress?: (done: number, total: number) => void;
};

export const fakeCompleter: Completer = async ({ key, targetTokens }) =>
  fakeReply(key, targetTokens);

export const planFor = (
  options: Pick<GenerateOptions, 'seed' | 'nodes' | 'depth' | 'model'>
) => buildPlan(buildShape(options), options.seed, options.model);

/** Builds the shape, fills it, and returns an Open Loom document. */
export const generateDocument = async (
  options: GenerateOptions
): Promise<OpenLoomDocument> => {
  const plan = planFor(options);
  const texts = await fillTree({
    plan,
    seed: options.seed,
    complete: options.complete,
    cache: options.cache,
    concurrency: options.concurrency,
    onProgress: options.onProgress,
  });
  return buildDocument({
    plan,
    texts,
    seed: options.seed,
    model: options.model,
    label: options.label,
  });
};
