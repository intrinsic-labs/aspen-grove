import { parseArgs } from 'node:util';

export type FailMode = 'status' | 'drop';

/** Everything the server's behaviour depends on, fixed at start. */
export type MockConfig = {
  readonly host: string;
  readonly port: number;
  /** Streamed tokens per second. */
  readonly pace: number;
  /** Tokens per reply (capped by the request's max_tokens). */
  readonly words: number;
  /** The model the server lists and answers for. */
  readonly modelId: string;
  /** Listed too, but every completion on it answers 404. */
  readonly missingModelId: string;
  /** Every Nth completion request fails (0: never). */
  readonly failEvery: number;
  /** `status`: answer `failStatus`; `drop`: cut the stream after `dropAfter` tokens. */
  readonly failMode: FailMode;
  readonly failStatus: number;
  readonly dropAfter: number;
  readonly quiet: boolean;
};

/** Tokens per second for `--slow`: a 60-token reply takes 20 s. */
export const SLOW_PACE = 3;

const toInt = (name: string, raw: string, min: number): number => {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`--${name} must be an integer >= ${min} (got "${raw}")`);
  }
  return value;
};

const toPositive = (name: string, raw: string): number => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--${name} must be a number > 0 (got "${raw}")`);
  }
  return value;
};

const toFailMode = (raw: string): FailMode => {
  if (raw === 'status' || raw === 'drop') {
    return raw;
  }
  throw new Error(`--fail-mode must be "status" or "drop" (got "${raw}")`);
};

/** Parses CLI arguments into a config; throws on a bad value. */
export const parseConfig = (args: readonly string[]): MockConfig => {
  const { values } = parseArgs({
    args: [...args],
    options: {
      host: { type: 'string', default: '127.0.0.1' },
      port: { type: 'string', default: '1235' },
      pace: { type: 'string', default: '20' },
      slow: { type: 'boolean', default: false },
      words: { type: 'string', default: '60' },
      model: { type: 'string', default: 'mock-model' },
      'missing-model': { type: 'string', default: 'mock-missing' },
      'fail-every': { type: 'string', default: '0' },
      'fail-mode': { type: 'string', default: 'status' },
      'fail-status': { type: 'string', default: '500' },
      'drop-after': { type: 'string', default: '8' },
      quiet: { type: 'boolean', default: false },
    },
    strict: true,
  });

  return {
    host: values.host as string,
    port: toInt('port', values.port as string, 0),
    pace: values.slow ? SLOW_PACE : toPositive('pace', values.pace as string),
    words: toInt('words', values.words as string, 1),
    modelId: values.model as string,
    missingModelId: values['missing-model'] as string,
    failEvery: toInt('fail-every', values['fail-every'] as string, 0),
    failMode: toFailMode(values['fail-mode'] as string),
    failStatus: toInt('fail-status', values['fail-status'] as string, 400),
    dropAfter: toInt('drop-after', values['drop-after'] as string, 0),
    quiet: values.quiet as boolean,
  };
};
