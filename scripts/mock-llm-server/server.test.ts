/**
 * @jest-environment node
 */
import { afterEach, describe, expect, it } from '@jest/globals';
import { request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { parseConfig } from './config.ts';
import { createMockServer } from './server.ts';

const servers: Server[] = [];

const start = async (args: readonly string[]) => {
  const lines: string[] = [];
  const server = createMockServer(
    parseConfig([...args, '--port', '0']),
    (line) => lines.push(line)
  );
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { port: (server.address() as AddressInfo).port, lines };
};

/** One streamed completion; resolves with its status once the body ends. */
const streamCompletion = (port: number): Promise<number> =>
  new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        method: 'POST',
        path: '/v1/chat/completions',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode ?? 0));
      }
    );
    req.on('error', reject);
    req.end(
      JSON.stringify({
        model: 'mock-model',
        stream: true,
        messages: [{ role: 'user', content: 'hi' }],
      })
    );
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

describe('mock server bursts', () => {
  it('fails one stream of an overlapping burst and lets the rest finish', async () => {
    const { port, lines } = await start([
      '--pace',
      '200',
      '--words',
      '20',
      '--fail-in-burst',
      '2',
      '--fail-status',
      '422',
    ]);

    const statuses = await Promise.all(
      [1, 2, 3].map(() => streamCompletion(port))
    );

    expect([...statuses].sort()).toEqual([200, 200, 422]);
    expect(
      lines
        .filter((line) => line.includes(' start '))
        .map((line) => line.match(/burst=(\d)/)?.[1])
        .sort()
    ).toEqual(['1', '2', '3']);
  });

  it('starts a new burst once every stream has closed', async () => {
    const { port } = await start([
      '--pace',
      '200',
      '--words',
      '5',
      '--fail-in-burst',
      '2',
      '--fail-status',
      '422',
    ]);

    // One at a time: each is the first of its own burst, so none fails.
    expect(await streamCompletion(port)).toBe(200);
    expect(await streamCompletion(port)).toBe(200);
  });
});
