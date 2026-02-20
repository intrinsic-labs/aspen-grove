import type { Collection, Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { fromByteArray, toByteArray } from 'base64-js';
import { gzip, ungzip } from 'pako';
import type {
  CreateRawApiResponseInput,
  IRawApiResponseRepository,
} from '@application/repositories';
import type {
  CompressionType,
  RawApiResponse,
  TokenUsage,
} from '@domain/entities';
import { createULID, type ULID } from '@domain/value-objects';

import RawApiResponseModel from '../model/RawApiResponse';
import { isPlainObject, isRecordNotFoundError, toOptionalString } from './helpers';

const GZIP: CompressionType = 'gzip';
const NONE: CompressionType = 'none';

/** WatermelonDB implementation of `IRawApiResponseRepository`. */
export class WatermelonRawApiResponseRepository
  implements IRawApiResponseRepository
{
  private readonly db: Database;
  private readonly rawApiResponses: Collection<RawApiResponseModel>;
  private readonly now: () => Date;

  constructor(database: Database, now: () => Date = () => new Date()) {
    this.db = database;
    this.rawApiResponses = this.db.get<RawApiResponseModel>('raw_api_responses');
    this.now = now;
  }

  async findById(id: ULID): Promise<RawApiResponse | null> {
    try {
      const model = await this.rawApiResponses.find(id);
      return this.toDomain(model);
    } catch (error) {
      if (isRecordNotFoundError(error, this.rawApiResponses.table)) {
        return null;
      }
      throw error;
    }
  }

  async findByNodeId(nodeId: ULID): Promise<RawApiResponse | null> {
    const models = await this.rawApiResponses
      .query(Q.where('node_id', nodeId), Q.sortBy('created_at', Q.desc))
      .fetch();

    if (models.length === 0) {
      return null;
    }

    return this.toDomain(models[0]);
  }

  async create(input: CreateRawApiResponseInput): Promise<RawApiResponse> {
    return this.db.write(async () => {
      const existing = await this.rawApiResponses
        .query(Q.where('node_id', input.nodeId))
        .fetch();
      if (existing.length > 0) {
        throw new Error(
          `RawApiResponse for node ${input.nodeId} already exists and cannot be replaced`
        );
      }

      const id = createULID();
      const createdAt = this.now();
      const responseBody = compressPayload(input.responseBody);
      const responseHeaders = compressPayload(input.responseHeaders);
      const tokenUsage = sanitizeTokenUsageForStorage(input.tokenUsage);

      const model = await this.rawApiResponses.create((record) => {
        record._raw.id = id;
        record.nodeId = input.nodeId;
        record.provider = input.provider;
        record.requestId = input.requestId ?? null;
        record.modelIdentifier = input.modelIdentifier;
        record.responseBody = responseBody;
        record.responseHeaders = responseHeaders;
        record.requestTimestamp = input.requestTimestamp;
        record.responseTimestamp = input.responseTimestamp;
        record.latencyMs = input.latencyMs;
        record.tokenUsage = tokenUsage;
        record.compressionType = GZIP;
        record.createdAt = createdAt;
      });

      return this.toDomain(model);
    });
  }

  async delete(id: ULID): Promise<boolean> {
    return this.db.write(async () => {
      try {
        const model = await this.rawApiResponses.find(id);
        await model.destroyPermanently();
        return true;
      } catch (error) {
        if (isRecordNotFoundError(error, this.rawApiResponses.table)) {
          return false;
        }
        throw error;
      }
    });
  }

  async deleteByNodeId(nodeId: ULID): Promise<boolean> {
    return this.db.write(async () => {
      const models = await this.rawApiResponses
        .query(Q.where('node_id', nodeId))
        .fetch();
      if (models.length === 0) {
        return false;
      }

      for (const model of models) {
        await model.destroyPermanently();
      }
      return true;
    });
  }

  private toDomain(model: RawApiResponseModel): RawApiResponse {
    const compressionType = readCompressionType(model.compressionType);

    return {
      id: model.id as ULID,
      nodeId: model.nodeId as ULID,
      provider: model.provider as RawApiResponse['provider'],
      requestId: toOptionalString(model.requestId),
      modelIdentifier: model.modelIdentifier,
      responseBody: decompressPayload(model.responseBody, compressionType),
      responseHeaders: decompressPayload(model.responseHeaders, compressionType),
      requestTimestamp: model.requestTimestamp,
      responseTimestamp: model.responseTimestamp,
      latencyMs: model.latencyMs,
      tokenUsage: sanitizeTokenUsageForDomain(model.tokenUsage),
      compressionType,
      createdAt: model.createdAt,
    };
  }
}

const compressPayload = (value: string): string => {
  const compressedBytes = gzip(value);
  return fromByteArray(compressedBytes);
};

const decompressPayload = (value: string, compressionType: CompressionType): string => {
  if (compressionType === NONE) {
    return value;
  }

  const compressedBytes = toByteArray(value);
  return ungzip(compressedBytes, { to: 'string' });
};

const readCompressionType = (raw: string | null | undefined): CompressionType => {
  return raw === NONE ? NONE : GZIP;
};

const sanitizeTokenUsageForDomain = (raw: unknown): TokenUsage | undefined => {
  const parsed = parseTokenUsage(raw);
  if (!parsed) {
    return undefined;
  }

  return parsed;
};

const sanitizeTokenUsageForStorage = (
  raw: unknown
): RawApiResponseModel['tokenUsage'] => {
  return parseTokenUsage(raw);
};

const parseTokenUsage = (raw: unknown): TokenUsage | null => {
  if (!isPlainObject(raw)) {
    return null;
  }

  const promptTokens = raw.promptTokens;
  const completionTokens = raw.completionTokens;
  const totalTokens = raw.totalTokens;

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
};
