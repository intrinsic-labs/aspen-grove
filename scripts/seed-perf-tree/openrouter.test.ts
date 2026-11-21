import { describe, expect, it, jest } from '@jest/globals';
import type { Completion } from './completion-response.ts';
import { estimateCost } from './cost.ts';
import { planFor } from './generate.ts';
import { createOpenRouterCompleter, MAX_REPLY_ATTEMPTS } from './openrouter.ts';
import type { CompletionRequest } from './types.ts';

// No network and no spend: every response here is canned.

type Reply = {
  readonly content?: string | null;
  readonly finish?: string;
  readonly reasoning?: number;
  readonly status?: number;
};

const response = ({
  content,
  finish = 'stop',
  reasoning = 60,
  status = 200,
}: Reply) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content }, finish_reason: finish }],
      usage: {
        completion_tokens: reasoning + 40,
        completion_tokens_details: { reasoning_tokens: reasoning },
      },
    }),
    { status }
  );

/** A fetch that answers each call with the next reply in turn. */
const scripted = (...replies: Reply[]) => {
  const bodies: Array<Record<string, unknown>> = [];
  const fetchMock = jest.fn(async (_url: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    const next = replies[Math.min(bodies.length - 1, replies.length - 1)];
    return response(next);
  });
  return { fetchMock, bodies };
};

const request: CompletionRequest = {
  messages: [{ role: 'user', content: 'Tell me about aspen.' }],
  maxTokens: 200,
  key: 'n-0001',
  seed: 1,
  targetTokens: 100,
};

const completer = (
  fetchMock: ReturnType<typeof scripted>['fetchMock'],
  extra: Parameters<typeof createOpenRouterCompleter>[2] = {}
) =>
  createOpenRouterCompleter('test-key', 'anthropic/claude-haiku-5.5', {
    fetch: fetchMock as unknown as typeof fetch,
    sleep: async () => {},
    ...extra,
  });

describe('createOpenRouterCompleter', () => {
  it('adds reasoning headroom to max_tokens', async () => {
    const { fetchMock, bodies } = scripted({ content: 'Aspen clones.' });

    await completer(fetchMock, { reasoningHeadroomTokens: 1024 })(request);

    expect(bodies[0].max_tokens).toBe(200 + 1024);
    expect(bodies[0]).not.toHaveProperty('reasoning');
  });

  it('asks again when a reply comes back empty', async () => {
    const { fetchMock } = scripted(
      { content: '', finish: 'length' },
      { content: null },
      { content: 'Aspen clones.' }
    );

    await expect(completer(fetchMock)(request)).resolves.toBe('Aspen clones.');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('gives up on a reply that stays empty, saying how much went to reasoning', async () => {
    const { fetchMock } = scripted({
      content: '  ',
      finish: 'length',
      reasoning: 260,
    });

    await expect(completer(fetchMock)(request)).rejects.toThrow(
      /empty completion 3 times for n-0001 \(reasoning used 260 tokens\)/
    );
    expect(fetchMock).toHaveBeenCalledTimes(MAX_REPLY_ATTEMPTS);
  });

  it('asks again when a reply is cut short, and keeps the last one with a warning', async () => {
    const { fetchMock } = scripted({ content: "I'm", finish: 'length' });
    const onWarning = jest.fn((_: string) => {});

    await expect(completer(fetchMock, { onWarning })(request)).resolves.toBe(
      "I'm"
    );
    expect(fetchMock).toHaveBeenCalledTimes(MAX_REPLY_ATTEMPTS);
    expect(onWarning).toHaveBeenCalledWith(expect.stringMatching(/cut short/));
  });

  it('retries a 5xx and stops at a 4xx', async () => {
    const flaky = scripted({ status: 503 }, { content: 'Aspen clones.' });
    await expect(completer(flaky.fetchMock)(request)).resolves.toBe(
      'Aspen clones.'
    );

    const refused = scripted({ status: 400 });
    await expect(completer(refused.fetchMock)(request)).rejects.toThrow(
      'OpenRouter HTTP 400'
    );
    expect(refused.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports each completion’s reasoning tokens', async () => {
    const { fetchMock } = scripted({ content: 'Aspen clones.', reasoning: 61 });
    const seen: Completion[] = [];

    await completer(fetchMock, { onUsage: (c) => seen.push(c) })(request);

    expect(seen).toEqual([
      {
        text: 'Aspen clones.',
        truncated: false,
        reasoningTokens: 61,
        completionTokens: 101,
      },
    ]);
  });
});

describe('estimateCost', () => {
  const plan = planFor({ seed: 1, nodes: 80, depth: 12, model: 'm' });
  const pricing = { inputPerM: 1, outputPerM: 5 };

  it('counts expected reasoning as output, and a ceiling at full headroom', () => {
    const without = estimateCost(plan, undefined, pricing, {
      headroomTokens: 0,
      expectedTokens: 0,
    });
    const withReasoning = estimateCost(plan, undefined, pricing, {
      headroomTokens: 1000,
      expectedTokens: 100,
    });

    expect(withReasoning.reasoningTokens).toBe(without.calls * 100);
    expect(withReasoning.outputTokens).toBe(
      without.outputTokens + without.calls * 100
    );
    expect(withReasoning.usd - without.usd).toBeCloseTo(
      (without.calls * 100 * 5) / 1e6
    );
    expect(withReasoning.maxUsd - without.usd).toBeCloseTo(
      (without.calls * 1000 * 5) / 1e6
    );
  });
});
