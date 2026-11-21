import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { openReplyCache } from './cache.ts';
import { estimateCost } from './cost.ts';
import { fakeCompleter, generateDocument, planFor } from './generate.ts';
import { createOpenRouterCompleter } from './openrouter.ts';
import { DEFAULT_REASONING_BUDGET } from './reasoning.ts';

// Current prices for anthropic/claude-haiku-5.5 on OpenRouter (USD per M tokens).
const DEFAULT_MODEL = 'anthropic/claude-haiku-5.5';
const OUT_DIR = join(import.meta.dirname, 'out');

const { values } = parseArgs({
  options: {
    fake: { type: 'boolean', default: false },
    yes: { type: 'boolean', default: false },
    seed: { type: 'string', default: '1' },
    nodes: { type: 'string', default: '520' },
    depth: { type: 'string', default: '40' },
    concurrency: { type: 'string', default: '4' },
    model: { type: 'string', default: DEFAULT_MODEL },
    'price-in': { type: 'string', default: '0.10' },
    'price-out': { type: 'string', default: '0.50' },
    'reasoning-headroom': {
      type: 'string',
      default: String(DEFAULT_REASONING_BUDGET.headroomTokens),
    },
    'reasoning-expected': {
      type: 'string',
      default: String(DEFAULT_REASONING_BUDGET.expectedTokens),
    },
    out: { type: 'string' },
  },
});

const main = async () => {
  const seed = Number(values.seed);
  const nodes = Number(values.nodes);
  const depth = Number(values.depth);
  const model = values.model as string;
  const reasoning = {
    headroomTokens: Number(values['reasoning-headroom']),
    expectedTokens: Number(values['reasoning-expected']),
  };
  const label = values.fake ? 'fake' : model;
  const outFile =
    values.out ??
    join(OUT_DIR, `perf-tree-${seed}-${values.fake ? 'fake' : 'llm'}.openloom`);
  const cache = values.fake
    ? undefined
    : openReplyCache(
        join(OUT_DIR, `cache-${seed}-${model.replace(/\W+/g, '_')}.jsonl`)
      );

  if (!values.fake) {
    const plan = planFor({ seed, nodes, depth, model });
    const estimate = estimateCost(
      plan,
      cache,
      {
        inputPerM: Number(values['price-in']),
        outputPerM: Number(values['price-out']),
      },
      reasoning
    );
    console.log(
      `Plan: ${plan.length} nodes, ${estimate.calls} model calls to make ` +
        `(${estimate.cachedCalls} cached) on ${model}.\n` +
        `Estimated: ~${estimate.inputTokens} input + ~${estimate.outputTokens} output tokens ` +
        `(~${estimate.reasoningTokens} of them reasoning, ${reasoning.expectedTokens} a call) ` +
        `= ~$${estimate.usd.toFixed(3)} at $${values['price-in']}/$${values['price-out']} per M.\n` +
        `At most ~$${estimate.maxUsd.toFixed(3)} if every call reasons up to its ` +
        `${reasoning.headroomTokens}-token headroom.`
    );
    if (!values.yes) {
      console.log(
        'Not spending. Re-run with --yes to call OpenRouter (or use --fake).'
      );
      return;
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!values.fake && !apiKey) {
    throw new Error(
      'Set OPENROUTER_API_KEY in the environment (or use --fake).'
    );
  }
  const usage = { calls: 0, reasoningTokens: 0, completionTokens: 0 };
  const document = await generateDocument({
    seed,
    nodes,
    depth,
    model,
    label,
    concurrency: Number(values.concurrency),
    complete: values.fake
      ? fakeCompleter
      : createOpenRouterCompleter(apiKey as string, model, {
          reasoningHeadroomTokens: reasoning.headroomTokens,
          onUsage: (completion) => {
            usage.calls++;
            usage.reasoningTokens += completion.reasoningTokens;
            usage.completionTokens += completion.completionTokens;
          },
          onWarning: (message) => console.warn(`  ${message}`),
        }),
    cache,
    onProgress: (done, total) => {
      if (done % 20 === 0 || done === total) {
        console.log(`  ${done}/${total} model replies`);
      }
    },
  });
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(document));
  if (usage.calls > 0) {
    console.log(
      `${usage.calls} completions: ${usage.completionTokens} output tokens, ` +
        `${usage.reasoningTokens} of them reasoning.`
    );
  }
  console.log(`Wrote ${outFile}`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
