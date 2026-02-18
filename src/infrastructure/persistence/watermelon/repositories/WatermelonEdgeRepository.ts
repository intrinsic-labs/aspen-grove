import type { Collection, Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type {
  IEdgeRepository,
  CreateEdgeInput,
} from '@application/repositories';
import type {
  Edge as EdgeEntity,
  EdgeSource as EdgeSourceEntity,
  EdgeType,
  SourceRole,
} from '@domain/entities';
import { createULID, type ULID } from '@domain/value-objects';

import { Edge as EdgeModel, EdgeSource as EdgeSourceModel } from '../model/Edge';
import { isRecordNotFoundError } from './helpers';

/** WatermelonDB implementation of `IEdgeRepository`. */
export class WatermelonEdgeRepository implements IEdgeRepository {
  private readonly db: Database;
  private readonly edges: Collection<EdgeModel>;
  private readonly edgeSources: Collection<EdgeSourceModel>;
  private readonly now: () => Date;

  constructor(database: Database, now: () => Date = () => new Date()) {
    this.db = database;
    this.edges = this.db.get<EdgeModel>('edges');
    this.edgeSources = this.db.get<EdgeSourceModel>('edge_sources');
    this.now = now;
  }

  async findById(id: ULID): Promise<EdgeEntity | null> {
    try {
      const edge = await this.edges.find(id);
      return this.toDomain(edge);
    } catch (error) {
      if (isRecordNotFoundError(error, this.edges.table)) {
        return null;
      }
      throw error;
    }
  }

  async create(input: CreateEdgeInput): Promise<EdgeEntity> {
    if (input.sources.length === 0) {
      throw new Error('Edge must include at least one source');
    }

    const edgeId = createULID();
    const createdAt = this.now();

    return this.db.write(async () => {
      await this.edges.create((record) => {
        record._raw.id = edgeId;
        record.loomTreeId = input.loomTreeId;
        record.targetNodeId = input.targetNodeId;
        record.edgeType = input.edgeType;
        record.createdAt = createdAt;
      });

      for (const source of input.sources) {
        await this.edgeSources.create((record) => {
          record._raw.id = createULID();
          record.edgeId = edgeId;
          record.sourceNodeId = source.nodeId;
          record.role = source.role;
        });
      }

      const edge = await this.edges.find(edgeId);
      return this.toDomain(edge);
    });
  }

  async delete(id: ULID): Promise<boolean> {
    return this.db.write(async () => {
      try {
        const edge = await this.edges.find(id);
        const sources = await this.edgeSources
          .query(Q.where('edge_id', id))
          .fetch();

        for (const source of sources) {
          await source.destroyPermanently();
        }

        await edge.destroyPermanently();
        return true;
      } catch (error) {
        if (isRecordNotFoundError(error, this.edges.table)) {
          return false;
        }
        throw error;
      }
    });
  }

  async findByLoomTreeId(loomTreeId: ULID): Promise<EdgeEntity[]> {
    const edges = await this.edges.query(Q.where('loom_tree_id', loomTreeId)).fetch();
    return this.toDomains(edges);
  }

  async findByTargetNodeId(targetNodeId: ULID): Promise<EdgeEntity[]> {
    const edges = await this.edges
      .query(Q.where('target_node_id', targetNodeId))
      .fetch();
    return this.toDomains(edges);
  }

  async findBySourceNodeId(sourceNodeId: ULID): Promise<EdgeEntity[]> {
    const sourceRows = await this.edgeSources
      .query(Q.where('source_node_id', sourceNodeId))
      .fetch();

    if (sourceRows.length === 0) {
      return [];
    }

    const edgeIds = [...new Set(sourceRows.map((row) => row.edgeId))];
    const edges = await this.edges
      .query(Q.where('id', Q.oneOf(edgeIds)))
      .fetch();

    return this.toDomains(edges);
  }

  async findByEdgeType(
    loomTreeId: ULID,
    edgeType: EdgeType
  ): Promise<EdgeEntity[]> {
    const edges = await this.edges
      .query(Q.where('loom_tree_id', loomTreeId), Q.where('edge_type', edgeType))
      .fetch();
    return this.toDomains(edges);
  }

  async findContinuationsByTargetNodeId(targetNodeId: ULID): Promise<EdgeEntity[]> {
    const edges = await this.edges
      .query(
        Q.where('target_node_id', targetNodeId),
        Q.where('edge_type', 'continuation')
      )
      .fetch();
    return this.toDomains(edges);
  }

  async findAnnotationsByTargetNodeId(targetNodeId: ULID): Promise<EdgeEntity[]> {
    const edges = await this.edges
      .query(
        Q.where('target_node_id', targetNodeId),
        Q.where('edge_type', 'annotation')
      )
      .fetch();
    return this.toDomains(edges);
  }

  async addSourceToEdge(edgeId: ULID, source: EdgeSourceEntity): Promise<EdgeEntity> {
    return this.db.write(async () => {
      await this.edges.find(edgeId);

      const existing = await this.edgeSources
        .query(
          Q.where('edge_id', edgeId),
          Q.where('source_node_id', source.nodeId)
        )
        .fetch();

      if (existing.length > 0) {
        await existing[0].update((record) => {
          record.role = source.role;
        });
      } else {
        await this.edgeSources.create((record) => {
          record._raw.id = createULID();
          record.edgeId = edgeId;
          record.sourceNodeId = source.nodeId;
          record.role = source.role;
        });
      }

      const edge = await this.edges.find(edgeId);
      return this.toDomain(edge);
    });
  }

  async removeSourceFromEdge(
    edgeId: ULID,
    sourceNodeId: ULID
  ): Promise<EdgeEntity | null> {
    return this.db.write(async () => {
      try {
        const edge = await this.edges.find(edgeId);

        const sources = await this.edgeSources
          .query(Q.where('edge_id', edgeId), Q.where('source_node_id', sourceNodeId))
          .fetch();

        for (const source of sources) {
          await source.destroyPermanently();
        }

        const remaining = await this.edgeSources
          .query(Q.where('edge_id', edgeId))
          .fetch();

        if (remaining.length === 0) {
          await edge.destroyPermanently();
          return null;
        }

        return this.toDomain(edge);
      } catch (error) {
        if (isRecordNotFoundError(error, this.edges.table)) {
          return null;
        }
        throw error;
      }
    });
  }

  private async toDomains(edges: EdgeModel[]): Promise<EdgeEntity[]> {
    if (edges.length === 0) {
      return [];
    }

    const edgeIds = edges.map((edge) => edge.id);
    const sourceRows = await this.edgeSources
      .query(Q.where('edge_id', Q.oneOf(edgeIds)))
      .fetch();

    const sourcesByEdgeId = new Map<string, EdgeSourceModel[]>();
    for (const sourceRow of sourceRows) {
      const existing = sourcesByEdgeId.get(sourceRow.edgeId) ?? [];
      existing.push(sourceRow);
      sourcesByEdgeId.set(sourceRow.edgeId, existing);
    }

    return edges.map((edge) =>
      this.mapEdge(edge, sourcesByEdgeId.get(edge.id) ?? [])
    );
  }

  private async toDomain(edge: EdgeModel): Promise<EdgeEntity> {
    const sourceRows = await this.edgeSources
      .query(Q.where('edge_id', edge.id))
      .fetch();
    return this.mapEdge(edge, sourceRows);
  }

  private mapEdge(edge: EdgeModel, sourceRows: EdgeSourceModel[]): EdgeEntity {
    return {
      id: edge.id as ULID,
      loomTreeId: edge.loomTreeId as ULID,
      sources: sourceRows.map((sourceRow) => ({
        nodeId: sourceRow.sourceNodeId as ULID,
        role: sourceRow.role as SourceRole,
      })),
      targetNodeId: edge.targetNodeId as ULID,
      edgeType: edge.edgeType as EdgeType,
      createdAt: edge.createdAt,
    };
  }
}
