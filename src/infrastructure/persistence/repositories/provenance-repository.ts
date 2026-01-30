/**
 * Provenance Repository Implementations (Stub)
 *
 * WatermelonDB implementation of IRawApiResponseRepository and ITimestampCertificateRepository.
 * Manages persistence for provenance entities (API evidence and RFC 3161 timestamps).
 *
 * NOTE: This is a stub implementation for Phase 1.
 * Full implementation planned for Phase 11 (Provenance & Verification).
 */

import { Database, Q } from '@nozbe/watermelondb';

import type {
  IRawApiResponseRepository,
  ITimestampCertificateRepository,
} from '../../../application/repositories';
import type {
  RawApiResponse,
  CreateRawApiResponseInput,
  TimestampCertificate,
  CreateTimestampCertificateInput,
  LlmProvider,
  Ulid,
} from '../../../domain';
import { NotFoundError, calculateLatency } from '../../../domain';
import { RawApiResponseModel, TimestampCertificateModel } from '../models';

// ============================================
// RawApiResponse Repository
// ============================================

/**
 * Convert a RawApiResponseModel to a domain RawApiResponse entity.
 */
function rawResponseToDomain(model: RawApiResponseModel): RawApiResponse {
  return model.toDomain();
}

/**
 * WatermelonDB implementation of RawApiResponse repository.
 *
 * @remarks Stub implementation - some methods throw NotImplementedError
 */
export class RawApiResponseRepository implements IRawApiResponseRepository {
  constructor(private database: Database) {}

  async create(input: CreateRawApiResponseInput): Promise<RawApiResponse> {
    const collection = this.database.get<RawApiResponseModel>('raw_api_responses');
    const now = Date.now();

    const created = await this.database.write(async () => {
      return collection.create((record) => {
        record._raw.id = input.id;
        record.nodeId = input.nodeId;
        record.provider = input.provider;
        record.requestId = input.requestId ?? null;
        record.modelIdentifier = input.modelIdentifier;
        record.responseBody = input.responseBody;
        record.responseHeaders = input.responseHeaders;
        record.requestTimestamp = input.requestTimestamp;
        record.responseTimestamp = input.responseTimestamp;
        record.latencyMs = calculateLatency(input.requestTimestamp, input.responseTimestamp);
        record.tokenUsage = input.tokenUsage ?? null;
        record.compressionType = input.compressionType;
        // Set readonly field via _raw
        (record._raw as Record<string, unknown>).created_at = now;
      });
    });

    return rawResponseToDomain(created);
  }

  async findById(id: Ulid): Promise<RawApiResponse | null> {
    try {
      const collection = this.database.get<RawApiResponseModel>('raw_api_responses');
      const model = await collection.find(id);
      return rawResponseToDomain(model);
    } catch {
      return null;
    }
  }

  async findByNodeId(nodeId: Ulid): Promise<RawApiResponse | null> {
    const collection = this.database.get<RawApiResponseModel>('raw_api_responses');
    const results = await collection.query(Q.where('node_id', nodeId)).fetch();

    if (results.length === 0) {
      return null;
    }

    return rawResponseToDomain(results[0]);
  }

  async existsForNode(nodeId: Ulid): Promise<boolean> {
    const collection = this.database.get<RawApiResponseModel>('raw_api_responses');
    const count = await collection.query(Q.where('node_id', nodeId)).fetchCount();
    return count > 0;
  }

  async findByProviderAndTimeRange(
    provider: LlmProvider,
    from: number,
    to: number
  ): Promise<RawApiResponse[]> {
    const collection = this.database.get<RawApiResponseModel>('raw_api_responses');
    const results = await collection
      .query(
        Q.where('provider', provider),
        Q.where('request_timestamp', Q.gte(from)),
        Q.where('request_timestamp', Q.lte(to))
      )
      .fetch();

    return results.map(rawResponseToDomain);
  }

  async delete(id: Ulid): Promise<boolean> {
    const collection = this.database.get<RawApiResponseModel>('raw_api_responses');

    let model: RawApiResponseModel;
    try {
      model = await collection.find(id);
    } catch {
      return false;
    }

    await this.database.write(async () => {
      await model.destroyPermanently();
    });

    return true;
  }

  async deleteByNodeId(nodeId: Ulid): Promise<boolean> {
    const collection = this.database.get<RawApiResponseModel>('raw_api_responses');
    const results = await collection.query(Q.where('node_id', nodeId)).fetch();

    if (results.length === 0) {
      return true; // Nothing to delete
    }

    await this.database.write(async () => {
      for (const model of results) {
        await model.destroyPermanently();
      }
    });

    return true;
  }

  async getStorageStats(): Promise<{ count: number; estimatedSizeBytes: number }> {
    const collection = this.database.get<RawApiResponseModel>('raw_api_responses');
    const count = await collection.query().fetchCount();

    // Rough estimate: average compressed response ~5KB
    // This is approximate - actual implementation would need to sum actual sizes
    const estimatedSizeBytes = count * 5000;

    return {
      count,
      estimatedSizeBytes,
    };
  }
}

// ============================================
// TimestampCertificate Repository
// ============================================

/**
 * Convert a TimestampCertificateModel to a domain TimestampCertificate entity.
 */
function certificateToDomain(model: TimestampCertificateModel): TimestampCertificate {
  return model.toDomain();
}

/**
 * WatermelonDB implementation of TimestampCertificate repository.
 *
 * @remarks Stub implementation - some methods throw NotImplementedError
 */
export class TimestampCertificateRepository implements ITimestampCertificateRepository {
  constructor(private database: Database) {}

  async create(input: CreateTimestampCertificateInput): Promise<TimestampCertificate> {
    const collection = this.database.get<TimestampCertificateModel>('timestamp_certificates');
    const now = Date.now();

    const created = await this.database.write(async () => {
      return collection.create((record) => {
        record._raw.id = input.id;
        record.nodeId = input.nodeId;
        record.contentHash = input.contentHash;
        record.timestampAuthority = input.timestampAuthority;
        record.certificate = input.certificate;
        record.timestamp = input.timestamp;
        record.verified = false;
        record.verifiedAt = null;
        // Set readonly field via _raw
        (record._raw as Record<string, unknown>).created_at = now;
      });
    });

    return certificateToDomain(created);
  }

  async findById(id: Ulid): Promise<TimestampCertificate | null> {
    try {
      const collection = this.database.get<TimestampCertificateModel>('timestamp_certificates');
      const model = await collection.find(id);
      return certificateToDomain(model);
    } catch {
      return null;
    }
  }

  async findByNodeId(nodeId: Ulid): Promise<TimestampCertificate | null> {
    const collection = this.database.get<TimestampCertificateModel>('timestamp_certificates');
    const results = await collection.query(Q.where('node_id', nodeId)).fetch();

    if (results.length === 0) {
      return null;
    }

    return certificateToDomain(results[0]);
  }

  async existsForNode(nodeId: Ulid): Promise<boolean> {
    const collection = this.database.get<TimestampCertificateModel>('timestamp_certificates');
    const count = await collection.query(Q.where('node_id', nodeId)).fetchCount();
    return count > 0;
  }

  async findUnverified(limit?: number): Promise<TimestampCertificate[]> {
    const collection = this.database.get<TimestampCertificateModel>('timestamp_certificates');

    let query = collection.query(Q.where('verified', false));

    if (limit !== undefined) {
      query = query.extend(Q.take(limit));
    }

    const results = await query.fetch();
    return results.map(certificateToDomain);
  }

  async markVerified(id: Ulid): Promise<TimestampCertificate> {
    const collection = this.database.get<TimestampCertificateModel>('timestamp_certificates');

    let model: TimestampCertificateModel;
    try {
      model = await collection.find(id);
    } catch {
      throw new NotFoundError('TimestampCertificate', id);
    }

    await this.database.write(async () => {
      await model.update((record) => {
        record.verified = true;
        record.verifiedAt = Date.now();
      });
    });

    return certificateToDomain(model);
  }

  async findByAuthority(authority: string): Promise<TimestampCertificate[]> {
    const collection = this.database.get<TimestampCertificateModel>('timestamp_certificates');
    const results = await collection.query(Q.where('timestamp_authority', authority)).fetch();

    return results.map(certificateToDomain);
  }

  async delete(id: Ulid): Promise<boolean> {
    const collection = this.database.get<TimestampCertificateModel>('timestamp_certificates');

    let model: TimestampCertificateModel;
    try {
      model = await collection.find(id);
    } catch {
      return false;
    }

    await this.database.write(async () => {
      await model.destroyPermanently();
    });

    return true;
  }

  async deleteByNodeId(nodeId: Ulid): Promise<boolean> {
    const collection = this.database.get<TimestampCertificateModel>('timestamp_certificates');
    const results = await collection.query(Q.where('node_id', nodeId)).fetch();

    if (results.length === 0) {
      return true; // Nothing to delete
    }

    await this.database.write(async () => {
      for (const model of results) {
        await model.destroyPermanently();
      }
    });

    return true;
  }

  async countByStatus(): Promise<{ verified: number; unverified: number }> {
    const collection = this.database.get<TimestampCertificateModel>('timestamp_certificates');

    const verified = await collection.query(Q.where('verified', true)).fetchCount();
    const unverified = await collection.query(Q.where('verified', false)).fetchCount();

    return { verified, unverified };
  }
}
