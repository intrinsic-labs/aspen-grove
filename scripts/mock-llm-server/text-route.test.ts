/**
 * @jest-environment node
 */
import { afterEach, describe, expect, it } from '@jest/globals';
import { request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { parseConfig } from './config.ts';
import { continuationTokens } from './reply-text.ts';
import { createMockServer } from './server.ts';

const servers: Server[] = [];

const start = async (args: readonly string[] = []) => {
  const lines: string[] = [];
  const server = createMockServer(
    parseConfig(['--pace', '500', '--words', '12', ...args, '--port', '0']),
    (line) => lines.push(line)
  );
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { port: (server.address() as AddressInfo).port, lines };
};

type Reply = { status: number; body: string };

const send = (
  port: number,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<Reply> =>
  new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (text += chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body: text })
        );
      }
    );
    req.on('error', reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });

const complete = (port: number, body: Record<string, unknown>) =>
  send(port, 'POST', '/v1/completions', { model: 'mock-base', ...body });

const textOf = (reply: Reply): string =>
  (JSON.parse(reply.body) as { choices: { text: string }[] }).choices[0].text;

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        })
    )
  );
});

describe('the base model in the model list', () => {
  it('is loaded, named for the fixture, and listed after mock-model', async () => {
    const { port } = await start();
    const { models } = JSON.parse(
      (await send(port, 'GET', '/api/v1/models')).body
    ) as {
      models: {
        key: string;
        display_name: string;
        loaded_instances: unknown[];
      }[];
    };

    expect(models.map((m) => m.key)).toEqual([
      'mock-model',
      'mock-base',
      'mock-missing',
    ]);
    expect(models[1]).toMatchObject({
      display_name: 'Writing fixture (base)',
    });
    expect(models[1].loaded_instances).toHaveLength(1);
  });

  it('stays out of the Anthropic and OpenAI lists', async () => {
    const { port } = await start();
    const { data } = JSON.parse(
      (await send(port, 'GET', '/v1/models')).body
    ) as {
      data: { id: string }[];
    };
    expect(data.map((m) => m.id)).not.toContain('mock-base');
  });

  it('answers 404 on a chat completion', async () => {
    const { port } = await start();
    const reply = await send(port, 'POST', '/v1/chat/completions', {
      model: 'mock-base',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(reply.status).toBe(404);
  });
});

describe('POST /v1/completions', () => {
  it('continues a prompt with text that begins with a space', async () => {
    const { port } = await start();
    const reply = await complete(port, { prompt: 'The snow fell' });

    expect(reply.status).toBe(200);
    const payload = JSON.parse(reply.body);
    expect(payload.object).toBe('text_completion');
    expect(payload.choices[0].message).toBeUndefined();
    expect(textOf(reply)).toMatch(/^ \S/);
    expect(payload.choices[0].finish_reason).toBe('stop');
  });

  it('differs per request, and repeats for the same order', async () => {
    const first = await start();
    const a = await complete(first.port, { prompt: 'same' });
    const b = await complete(first.port, { prompt: 'same' });
    expect(textOf(a)).not.toBe(textOf(b));

    const second = await start();
    expect(textOf(await complete(second.port, { prompt: 'same' }))).toBe(
      textOf(a)
    );
  });

  it('begins with a different word for each of consecutive slots', () => {
    const firsts = [1, 2, 3, 4].map(
      (n) => continuationTokens({ requestNumber: n, prompt: 'p', count: 3 })[0]
    );
    expect(new Set(firsts).size).toBe(4);
    expect(firsts.every((token) => token.startsWith(' '))).toBe(true);
  });

  it('is capped by max_tokens and says so', async () => {
    const { port } = await start();
    const reply = await complete(port, { prompt: 'x', max_tokens: 3 });
    const payload = JSON.parse(reply.body);

    expect(payload.choices[0].text.trim().split(' ')).toHaveLength(3);
    expect(payload.choices[0].finish_reason).toBe('length');
    expect(payload.usage.completion_tokens).toBe(3);
  });

  it('streams text deltas, a finish event, a usage-only event, then [DONE]', async () => {
    const { port } = await start();
    const reply = await complete(port, {
      prompt: 'x',
      stream: true,
      max_tokens: 4,
      stream_options: { include_usage: true },
    });
    const events = reply.body
      .split('\n\n')
      .filter(Boolean)
      .map((e) => e.replace(/^data: /, ''));

    expect(events[events.length - 1]).toBe('[DONE]');
    const parsed = events.slice(0, -1).map((e) => JSON.parse(e));
    const texts = parsed.map((p) => p.choices[0]?.text);
    expect(texts.slice(0, 4).every((t) => t.startsWith(' '))).toBe(true);
    expect(parsed[4].choices[0]).toMatchObject({
      text: '',
      finish_reason: 'length',
    });
    expect(parsed[5]).toMatchObject({
      choices: [],
      usage: { completion_tokens: 4 },
    });
  });

  it('rejects a chat-shaped body, a non-string prompt and a chat model', async () => {
    const { port } = await start();

    const chat = await complete(port, {
      prompt: 'x',
      messages: [{ role: 'user', content: 'hi' }],
    });
    const arrayPrompt = await complete(port, { prompt: ['a', 'b'] });
    const noPrompt = await complete(port, {});
    const wrongModel = await send(port, 'POST', '/v1/completions', {
      model: 'mock-model',
      prompt: 'x',
    });
    const notJson = await send(port, 'POST', '/v1/completions');

    expect([chat, arrayPrompt, noPrompt].map((r) => r.status)).toEqual([
      400, 400, 400,
    ]);
    expect(wrongModel.status).toBe(404);
    expect(notJson.status).toBe(400);
  });

  it('shares request numbers and failure plans with chat', async () => {
    const { port, lines } = await start([
      '--fail-every',
      '2',
      '--fail-status',
      '422',
    ]);

    const chat = await send(port, 'POST', '/v1/chat/completions', {
      model: 'mock-model',
      messages: [{ role: 'user', content: 'hi' }],
    });
    const text = await complete(port, { prompt: 'x' });

    expect(chat.status).toBe(200);
    expect(text.status).toBe(422); // the second request overall
    expect(
      lines.some(
        (l) => l.startsWith('#2 start') && l.includes('route=/v1/completions')
      )
    ).toBe(true);
  });

  it('fails one stream of an overlapping burst of text requests', async () => {
    const { port } = await start([
      '--fail-in-burst',
      '2',
      '--fail-status',
      '422',
    ]);
    const replies = await Promise.all(
      [1, 2, 3].map(() => complete(port, { prompt: 'x', stream: true }))
    );
    expect(replies.map((r) => r.status).sort()).toEqual([200, 200, 422]);
  });

  it('logs the route, prompt byte length, cap and concurrency', async () => {
    const { port, lines } = await start();
    await complete(port, { prompt: 'héllo', max_tokens: 5 });

    const startLine = lines.find((l) => l.includes('route=/v1/completions'))!;
    expect(startLine).toContain('prompt_bytes=6');
    expect(startLine).toContain('max_tokens=5');
    expect(startLine).toContain('active=1');
    expect(startLine).not.toContain('héllo');
  });
});
