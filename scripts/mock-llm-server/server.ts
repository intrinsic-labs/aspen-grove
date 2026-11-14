import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { MockConfig } from './config.ts';
import { planRequest, type RequestPlan } from './failure-plan.ts';
import {
  completionPayload,
  errorPayload,
  modelsPayload,
  sseChunk,
  SSE_DONE,
  usageFor,
} from './payloads.ts';
import { lastMessageText, replyTokens } from './reply-text.ts';
import { requestSummary } from './request-summary.ts';
import { isTitleRequest, titleText } from './title-request.ts';

type ChatBody = {
  readonly model?: unknown;
  readonly messages?: unknown;
  readonly stream?: unknown;
  readonly max_tokens?: unknown;
  readonly temperature?: unknown;
};

type Log = (line: string) => void;

const sendJson = (
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): void => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The subset of LM Studio's HTTP API the app's adapter calls:
 * `GET /api/v1/models` (model picker and Connections' test) and
 * `POST /v1/chat/completions`, streamed (SSE) or not (titles, fallback).
 */
export const createMockServer = (config: MockConfig, log: Log): Server => {
  let requestCount = 0;
  let active = 0;
  const tokenMs = 1000 / config.pace;

  const streamReply = async (
    res: ServerResponse,
    meta: { id: string; model: string; tokens: string[]; capped: boolean },
    plan: RequestPlan,
    prompt: string,
    isClosed: () => boolean
  ): Promise<string> => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'x-request-id': meta.id,
    });
    for (let i = 0; i < meta.tokens.length; i++) {
      await sleep(tokenMs);
      if (isClosed()) {
        return `client closed after ${i} tokens`;
      }
      if (plan.kind === 'drop' && i >= plan.afterTokens) {
        res.socket?.destroy();
        return `dropped after ${i} tokens (injected)`;
      }
      res.write(sseChunk({ ...meta, content: meta.tokens[i] }));
    }
    res.write(
      sseChunk({
        ...meta,
        finishReason: meta.capped ? 'length' : 'stop',
        usage: usageFor(prompt, meta.tokens.length),
      })
    );
    res.end(SSE_DONE);
    return `done, ${meta.tokens.length} tokens`;
  };

  const handleChat = async (
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> => {
    const number = ++requestCount;
    const id = `mock-${number}`;
    let body: ChatBody;
    try {
      body = JSON.parse(await readBody(req)) as ChatBody;
    } catch {
      sendJson(res, 400, errorPayload('Request body is not JSON.'));
      return;
    }
    const model = typeof body.model === 'string' ? body.model : '';
    const stream = body.stream === true;
    const plan = planRequest(config, number, model);
    const started = Date.now();
    active += 1;
    log(`#${number} start ${stream ? 'stream' : 'plain'} model=${model} plan=${plan.kind} active=${active} ${requestSummary(body)}`);

    let closed = false;
    res.on('close', () => {
      closed = true;
    });

    let result: string;
    try {
      if (plan.kind === 'missing-model' || (model && model !== config.modelId)) {
        sendJson(res, 404, errorPayload(`Model "${model}" not found.`));
        result = '404 model not found';
      } else if (plan.kind === 'status') {
        sendJson(
          res,
          plan.status,
          errorPayload(`Injected failure on request #${number}.`)
        );
        result = `${plan.status} (injected)`;
      } else if (isTitleRequest(body)) {
        const prompt = lastMessageText(body.messages);
        const text = titleText(number);
        await sleep(tokenMs);
        sendJson(
          res,
          200,
          completionPayload({
            id,
            model: config.modelId,
            text,
            finishReason: 'stop',
            usage: usageFor(prompt, text.split(' ').length),
          }),
          { 'x-request-id': id }
        );
        result = `title "${text}"`;
      } else {
        const prompt = lastMessageText(body.messages);
        const maxTokens =
          typeof body.max_tokens === 'number' && body.max_tokens > 0
            ? body.max_tokens
            : Infinity;
        const count = Math.min(config.words, maxTokens);
        const tokens = replyTokens({ requestNumber: number, prompt, count });
        const capped = count < config.words;
        const meta = { id, model: config.modelId, tokens, capped };
        if (stream) {
          result = await streamReply(res, meta, plan, prompt, () => closed);
        } else {
          await sleep(tokenMs * tokens.length);
          if (plan.kind === 'drop') {
            res.socket?.destroy();
            result = 'dropped (injected)';
          } else {
            sendJson(
              res,
              200,
              completionPayload({
                id,
                model: config.modelId,
                text: tokens.join(''),
                finishReason: capped ? 'length' : 'stop',
                usage: usageFor(prompt, tokens.length),
              }),
              { 'x-request-id': id }
            );
            result = `done, ${tokens.length} tokens`;
          }
        }
      }
    } finally {
      active -= 1;
    }
    log(`#${number} end ${result} in ${Date.now() - started}ms active=${active}`);
  };

  return createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0];
    if (req.method === 'GET' && path === '/api/v1/models') {
      log('GET /api/v1/models');
      sendJson(res, 200, modelsPayload([config.modelId, config.missingModelId]));
      return;
    }
    if (req.method === 'POST' && path === '/v1/chat/completions') {
      handleChat(req, res).catch((error: unknown) => {
        log(`chat handler error: ${String(error)}`);
        if (!res.headersSent) {
          sendJson(res, 500, errorPayload('Mock server error.'));
        } else {
          res.destroy();
        }
      });
      return;
    }
    log(`${req.method} ${path} -> 404 (not mocked)`);
    sendJson(res, 404, errorPayload(`Not mocked: ${req.method} ${path}`));
  });
};
