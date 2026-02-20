import { Model } from '@nozbe/watermelondb';
import {
  date,
  field,
  immutableRelation,
  json,
  text,
} from '@nozbe/watermelondb/decorators';

type TokenUsageRecord = {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
};

/**
 * Persistence model (Infrastructure).
 *
 * Provenance evidence record for model-generated nodes.
 * - `responseBody` / `responseHeaders` contain compressed payloads (gzip+base64).
 * - `tokenUsage` is stored as JSON string and sanitized on read.
 * - Records are append-only in practice: create once, read/delete only.
 */
export default class RawApiResponse extends Model {
  static table = 'raw_api_responses';

  static associations = {
    nodes: { type: 'belongs_to', key: 'node_id' },
  } as const;

  @field('node_id') nodeId!: string;
  @field('provider') provider!: string;
  @text('request_id') requestId!: string | null;
  @field('model_identifier') modelIdentifier!: string;
  @text('response_body') responseBody!: string;
  @text('response_headers') responseHeaders!: string;
  @date('request_timestamp') requestTimestamp!: Date;
  @date('response_timestamp') responseTimestamp!: Date;
  @field('latency_ms') latencyMs!: number;
  @json('token_usage', sanitizeTokenUsage)
  tokenUsage!: TokenUsageRecord | null;
  @field('compression_type') compressionType!: string;
  @date('created_at') createdAt!: Date;

  @immutableRelation('nodes', 'node_id') node!: Model;
}

function sanitizeTokenUsage(raw: unknown): TokenUsageRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const promptTokens = record.promptTokens;
  const completionTokens = record.completionTokens;
  const totalTokens = record.totalTokens;

  if (
    !Number.isFinite(promptTokens) ||
    !Number.isFinite(completionTokens) ||
    !Number.isFinite(totalTokens)
  ) {
    return null;
  }

  return {
    promptTokens: Number(promptTokens),
    completionTokens: Number(completionTokens),
    totalTokens: Number(totalTokens),
  };
}
