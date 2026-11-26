import type { Usage } from './payloads.ts';

/**
 * `POST /v1/completions` bodies: the legacy OpenAI shape, text in
 * `choices[].text` (no messages, no deltas).
 */

type Finish = 'stop' | 'length';

export const textCompletionPayload = (input: {
  readonly id: string;
  readonly model: string;
  readonly text: string;
  readonly finishReason: Finish;
  readonly usage: Usage;
}) => ({
  id: input.id,
  object: 'text_completion',
  created: Math.floor(Date.now() / 1000),
  model: input.model,
  choices: [
    {
      index: 0,
      text: input.text,
      finish_reason: input.finishReason,
      logprobs: null,
    },
  ],
  usage: input.usage,
});

const event = (body: unknown): string => `data: ${JSON.stringify(body)}\n\n`;

/** One streamed piece of text. */
export const textSseDelta = (input: {
  readonly id: string;
  readonly model: string;
  readonly text: string;
}): string =>
  event({
    id: input.id,
    object: 'text_completion',
    created: Math.floor(Date.now() / 1000),
    model: input.model,
    choices: [{ index: 0, text: input.text, finish_reason: null }],
  });

/**
 * The end of a stream: an empty-text event carrying the finish reason, then
 * (when asked for) a usage-only event with no choices, then `[DONE]`.
 */
export const textSseEnd = (input: {
  readonly id: string;
  readonly model: string;
  readonly finishReason: Finish;
  readonly usage?: Usage;
}): string =>
  [
    event({
      id: input.id,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: input.model,
      choices: [{ index: 0, text: '', finish_reason: input.finishReason }],
    }),
    input.usage
      ? event({
          id: input.id,
          object: 'text_completion',
          model: input.model,
          choices: [],
          usage: input.usage,
        })
      : '',
    'data: [DONE]\n\n',
  ].join('');
