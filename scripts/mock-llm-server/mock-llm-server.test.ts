import { describe, expect, it } from '@jest/globals';
import { parseConfig, SLOW_PACE } from './config.ts';
import { planRequest } from './failure-plan.ts';
import { modelsPayload, sseChunk, SSE_DONE } from './payloads.ts';
import { lastMessageText, replyTokens } from './reply-text.ts';
import { isTitleRequest, titleText } from './title-request.ts';

describe('parseConfig', () => {
  it('has defaults that need no arguments', () => {
    const config = parseConfig([]);
    expect(config).toMatchObject({
      port: 1235,
      pace: 20,
      words: 60,
      modelId: 'mock-model',
      missingModelId: 'mock-missing',
      failEvery: 0,
      failMode: 'status',
      failStatus: 500,
    });
  });

  it('reads the documented flags', () => {
    const config = parseConfig([
      '--port', '1240', '--pace', '5', '--fail-every', '3',
      '--fail-mode', 'drop', '--drop-after', '2', '--words', '400',
    ]);
    expect(config).toMatchObject({
      port: 1240,
      pace: 5,
      failEvery: 3,
      failMode: 'drop',
      dropAfter: 2,
      words: 400,
    });
  });

  it('lets --slow override the pace', () => {
    expect(parseConfig(['--pace', '50', '--slow']).pace).toBe(SLOW_PACE);
  });

  it('rejects bad values and unknown flags', () => {
    expect(() => parseConfig(['--pace', '0'])).toThrow('--pace');
    expect(() => parseConfig(['--fail-every', '-1'])).toThrow('--fail-every');
    expect(() => parseConfig(['--fail-mode', 'explode'])).toThrow('--fail-mode');
    expect(() => parseConfig(['--fail-status', '200'])).toThrow('--fail-status');
    expect(() => parseConfig(['--nope'])).toThrow();
  });
});

describe('planRequest', () => {
  const base = parseConfig([]);

  it('never fails without --fail-every', () => {
    for (let n = 1; n <= 10; n++) {
      expect(planRequest(base, n, 'mock-model')).toEqual({ kind: 'ok' });
    }
  });

  it('fails every Nth request with the configured status', () => {
    const config = { ...base, failEvery: 3, failStatus: 422 };
    const kinds = [1, 2, 3, 4, 5, 6].map(
      (n) => planRequest(config, n, 'mock-model').kind
    );
    expect(kinds).toEqual(['ok', 'ok', 'status', 'ok', 'ok', 'status']);
    expect(planRequest(config, 3, 'mock-model')).toEqual({
      kind: 'status',
      status: 422,
    });
  });

  it('drops mid-stream in drop mode', () => {
    const config = { ...base, failEvery: 2, failMode: 'drop' as const, dropAfter: 5 };
    expect(planRequest(config, 4, 'mock-model')).toEqual({
      kind: 'drop',
      afterTokens: 5,
    });
  });

  it('always answers 404 for the missing model', () => {
    expect(planRequest(base, 1, 'mock-missing')).toEqual({
      kind: 'missing-model',
    });
  });
});

describe('replyTokens', () => {
  it('is deterministic and numbered by request', () => {
    const a = replyTokens({ requestNumber: 7, prompt: 'hi', count: 20 });
    const b = replyTokens({ requestNumber: 7, prompt: 'hi', count: 20 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(20);
    expect(a.join('').startsWith('Mock reply #7. ')).toBe(true);
  });

  it('differs between consecutive requests (parallel cards)', () => {
    const one = replyTokens({ requestNumber: 1, prompt: 'hi', count: 30 });
    const two = replyTokens({ requestNumber: 2, prompt: 'hi', count: 30 });
    expect(one.slice(3).join('')).not.toEqual(two.slice(3).join(''));
  });

  it('breaks sentences and paragraphs', () => {
    const text = replyTokens({ requestNumber: 1, prompt: '', count: 120 }).join('');
    expect(text).toContain('.\n\n');
    expect(text).not.toMatch(/\n\n /);
    expect(text).not.toMatch(/ {2}/);
    expect(text).not.toMatch(/\. [a-z]/);
  });
});

describe('lastMessageText', () => {
  it('reads string and text-part content', () => {
    expect(lastMessageText([{ content: 'a' }, { content: 'b' }])).toBe('b');
    expect(
      lastMessageText([{ content: [{ type: 'text', text: 'x' }, { type: 'image_url' }] }])
    ).toBe('x');
    expect(lastMessageText(undefined)).toBe('');
  });
});

describe('isTitleRequest', () => {
  const titleMessages = [
    {
      role: 'system',
      content:
        'You title conversations. Reply with only a title: at most six words, no quotes, no trailing punctuation.',
    },
    { role: 'user', content: 'Title this conversation.\n\nUser: hi\n\nAssistant: hello' },
  ];

  it("recognises Auto-Title's request by its system prompt or its user message", () => {
    expect(isTitleRequest({ stream: false, messages: titleMessages })).toBe(true);
    expect(isTitleRequest({ messages: [titleMessages[0]] })).toBe(true);
    expect(isTitleRequest({ messages: [titleMessages[1]] })).toBe(true);
    expect(
      isTitleRequest({
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Title this conversation.' }] }],
      })
    ).toBe(true);
  });

  it('leaves replies alone, including streamed ones and a user asking for a title mid-text', () => {
    expect(isTitleRequest({ stream: true, messages: titleMessages })).toBe(false);
    expect(
      isTitleRequest({ stream: false, messages: [{ role: 'user', content: 'Say hello.' }] })
    ).toBe(false);
    expect(
      isTitleRequest({
        messages: [{ role: 'user', content: 'Please title this conversation for me.' }],
      })
    ).toBe(false);
    expect(isTitleRequest({ messages: undefined })).toBe(false);
  });

  it('titles with a short numbered phrase', () => {
    expect(titleText(3)).toBe('Mock title #3');
  });
});

describe('payloads', () => {
  it('frames SSE events the way the adapter parses them', () => {
    const frame = sseChunk({ id: 'mock-1', model: 'm', content: ' hi' });
    expect(frame.startsWith('data: ')).toBe(true);
    expect(frame.endsWith('\n\n')).toBe(true);
    const payload = JSON.parse(frame.slice('data: '.length));
    expect(payload.choices[0].delta.content).toBe(' hi');
    expect(payload.choices[0].finish_reason).toBeNull();
    expect(SSE_DONE).toBe('data: [DONE]\n\n');
  });

  it('puts usage and the finish reason on the final event', () => {
    const usage = { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 };
    const payload = JSON.parse(
      sseChunk({ id: 'x', model: 'm', finishReason: 'stop', usage }).slice(6)
    );
    expect(payload.choices[0].delta).toEqual({});
    expect(payload.choices[0].finish_reason).toBe('stop');
    expect(payload.usage).toEqual(usage);
  });

  it('lists models as loaded LLMs keyed by id', () => {
    const { models } = modelsPayload(['a', 'b']);
    expect(models.map((m) => m.key)).toEqual(['a', 'b']);
    expect(models.every((m) => m.type === 'llm' && m.loaded_instances.length === 1)).toBe(true);
  });
});
