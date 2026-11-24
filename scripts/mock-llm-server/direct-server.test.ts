/** @jest-environment node */
import { request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { parseConfig } from './config.ts';
import { createMockServer } from './server.ts';

const servers: Server[] = [];
const start = async (args: string[] = []) => {
  const server = createMockServer(
    parseConfig([
      '--port',
      '0',
      '--pace',
      '1000',
      '--words',
      '8',
      '--model',
      'gpt-4.1',
      ...args,
    ]),
    () => {}
  );
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return (server.address() as AddressInfo).port;
};
const call = (
  port: number,
  path: string,
  body?: object,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', ...headers },
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body: text })
        );
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.end(body ? JSON.stringify(body) : undefined);
  });
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

describe.each(['/v1/messages', '/v1/responses'])('%s mock', (path) => {
  const anthropic = path === '/v1/messages';
  const body = (stream: boolean, model = 'gpt-4.1') => ({
    model,
    stream,
    ...(anthropic
      ? {
          system: 'Be brief',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 4,
        }
      : {
          instructions: 'Be brief',
          input: [{ role: 'user', content: 'Hi' }],
          max_output_tokens: 4,
        }),
  });
  it('streams deterministic numbered text, usage and the protocol terminal event', async () => {
    const port = await start();
    const response = await call(port, path, body(true));
    expect(response.status).toBe(200);
    const events = response.body
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => JSON.parse(line.slice(6)));
    expect(events.map((event) => event.type)).toContain(
      anthropic ? 'content_block_delta' : 'response.output_text.delta'
    );
    const deltas = events
      .filter(
        (event) =>
          event.type ===
          (anthropic ? 'content_block_delta' : 'response.output_text.delta')
      )
      .map((event) => (anthropic ? event.delta.text : event.delta))
      .join('');
    expect(deltas).toContain('Mock reply #1.');
    expect(events.at(-1).type).toBe(
      anthropic ? 'message_stop' : 'response.incomplete'
    );
    const end = events.find(
      (event) =>
        event.type === (anthropic ? 'message_delta' : 'response.incomplete')
    );
    expect(
      anthropic ? end.usage.output_tokens : end.response.usage.output_tokens
    ).toBe(4);
    expect(
      anthropic ? end.delta.stop_reason : end.response.incomplete_details.reason
    ).toBe(anthropic ? 'max_tokens' : 'max_output_tokens');
  });
  it('answers plain requests and titles in provider format', async () => {
    const port = await start();
    const response = JSON.parse((await call(port, path, body(false))).body);
    expect(
      anthropic ? response.content[0].text : response.output[0].content[0].text
    ).toContain('Mock reply #1.');
    const title = await call(port, path, {
      ...body(false),
      ...(anthropic
        ? { system: 'You title conversations.' }
        : { instructions: 'You title conversations.' }),
    });
    const payload = JSON.parse(title.body);
    expect(
      anthropic ? payload.content[0].text : payload.output[0].content[0].text
    ).toBe('Mock title #2');
  });
  it('supports one failed slot in a concurrent burst and unavailable models', async () => {
    const port = await start([
      '--pace',
      '100',
      '--fail-in-burst',
      '2',
      '--fail-status',
      '429',
    ]);
    const responses = await Promise.all(
      [1, 2, 3].map(() => call(port, path, body(true)))
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 200, 429,
    ]);
    expect((await call(port, path, body(true, 'missing'))).status).toBe(404);
  });
});
it('lists native models for each authenticated connection', async () => {
  const port = await start();
  const anthropic = JSON.parse(
    (await call(port, '/v1/models', undefined, { 'x-api-key': 'mock' })).body
  );
  expect(anthropic).toMatchObject({
    has_more: false,
    data: [
      { id: 'gpt-4.1', display_name: 'gpt-4.1', max_tokens: 4096 },
      { id: 'mock-missing' },
    ],
  });
  const openai = JSON.parse(
    (
      await call(port, '/v1/models', undefined, {
        Authorization: 'Bearer mock',
      })
    ).body
  );
  expect(openai.data[0]).toMatchObject({ id: 'gpt-4.1', object: 'model' });
});
