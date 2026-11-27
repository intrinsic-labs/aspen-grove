import type { IncomingMessage, ServerResponse } from 'node:http';
import type { MockConfig } from './config.ts';
import { planRequest } from './failure-plan.ts';
import { readBody, sendJson, sleep, type Log } from './http-helpers.ts';
import { errorPayload, usageFor } from './payloads.ts';
import { continuationTokens } from './reply-text.ts';
import type { RequestTracker } from './request-tracker.ts';
import {
  textCompletionPayload,
  textSseDelta,
  textSseEnd,
} from './text-payloads.ts';

type TextBody = {
  readonly model?: unknown;
  readonly prompt?: unknown;
  readonly messages?: unknown;
  readonly stream?: unknown;
  readonly max_tokens?: unknown;
  readonly stream_options?: unknown;
};

/** Why a body isn't a base-model text request, or null when it is one. */
const rejection = (
  body: TextBody,
  baseModelId: string
): { status: number; message: string } | null => {
  if (body.messages !== undefined) {
    return {
      status: 400,
      message: '/v1/completions takes a string "prompt", not chat "messages".',
    };
  }
  if (typeof body.prompt !== 'string') {
    return { status: 400, message: '"prompt" must be a string.' };
  }
  if (body.model !== baseModelId) {
    return {
      status: 404,
      message: `Model "${String(body.model)}" is not a base model here; use "${baseModelId}".`,
    };
  }
  return null;
};

/**
 * `POST /v1/completions`: a base model continues the prompt verbatim. Same
 * request numbering, bursts, pacing and failure plans as the chat routes,
 * through the shared tracker; its log lines add the prompt's byte length and
 * the token cap.
 */
export const handleTextCompletion = async (input: {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  readonly config: MockConfig;
  readonly tracker: RequestTracker;
  readonly log: Log;
}): Promise<void> => {
  const { req, res, config, tracker, log } = input;
  const { number, id, arrival } = tracker.arrive(res);
  const tokenMs = 1000 / config.pace;
  let body: TextBody;
  try {
    const parsed: unknown = JSON.parse(await readBody(req));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    body = parsed as TextBody;
  } catch {
    sendJson(res, 400, errorPayload('Request body is not a JSON object.'));
    return;
  }

  const stream = body.stream === true;
  const rejected = rejection(body, config.baseModelId);
  const promptBytes =
    typeof body.prompt === 'string'
      ? Buffer.byteLength(body.prompt, 'utf8')
      : 0;
  const maxTokens =
    typeof body.max_tokens === 'number' && body.max_tokens > 0
      ? Math.floor(body.max_tokens)
      : Infinity;
  const burstPosition = stream ? arrival : undefined;
  const plan = rejected
    ? ({ kind: 'ok' } as const)
    : planRequest(config, number, config.baseModelId, burstPosition);
  const started = Date.now();
  const active = tracker.begin();
  const burst = burstPosition ? ` burst=${burstPosition}` : '';
  log(
    `#${number} start ${stream ? 'stream' : 'plain'} route=/v1/completions model=${String(body.model)} plan=${rejected ? `reject-${rejected.status}` : plan.kind} active=${active}${burst} prompt_bytes=${promptBytes} max_tokens=${Number.isFinite(maxTokens) ? maxTokens : '-'}`
  );

  let closed = false;
  res.on('close', () => {
    closed = true;
  });
  let result: string;
  try {
    if (rejected) {
      sendJson(res, rejected.status, errorPayload(rejected.message));
      result = `${rejected.status} rejected`;
    } else if (plan.kind === 'status') {
      sendJson(
        res,
        plan.status,
        errorPayload(`Injected failure on request #${number}.`)
      );
      result = `${plan.status} (injected)`;
    } else {
      const prompt = body.prompt as string;
      const count = Math.min(config.words, maxTokens);
      const tokens = continuationTokens({
        requestNumber: number,
        prompt,
        count,
      });
      const finishReason = count < config.words ? 'length' : 'stop';
      const model = config.baseModelId;
      const withUsage =
        (body.stream_options as { include_usage?: unknown } | undefined)
          ?.include_usage === true;
      if (stream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'x-request-id': id,
        });
        let sent = 0;
        let outcome: string | null = null;
        for (const token of tokens) {
          await sleep(tokenMs);
          if (closed) {
            outcome = `client closed after ${sent} tokens`;
            break;
          }
          if (plan.kind === 'drop' && sent >= plan.afterTokens) {
            res.socket?.destroy();
            outcome = `dropped after ${sent} tokens (injected)`;
            break;
          }
          res.write(textSseDelta({ id, model, text: token }));
          sent += 1;
        }
        if (outcome === null) {
          res.end(
            textSseEnd({
              id,
              model,
              finishReason,
              usage: withUsage ? usageFor(prompt, tokens.length) : undefined,
            })
          );
        }
        result = outcome ?? `done, ${tokens.length} tokens`;
      } else {
        await sleep(tokenMs * tokens.length);
        if (plan.kind === 'drop') {
          res.socket?.destroy();
          result = 'dropped (injected)';
        } else {
          sendJson(
            res,
            200,
            textCompletionPayload({
              id,
              model,
              text: tokens.join(''),
              finishReason,
              usage: usageFor(prompt, tokens.length),
            }),
            { 'x-request-id': id }
          );
          result = `done, ${tokens.length} tokens`;
        }
      }
    }
  } finally {
    tracker.end();
  }
  log(
    `#${number} end ${result} in ${Date.now() - started}ms active=${tracker.activeCount()}`
  );
};
