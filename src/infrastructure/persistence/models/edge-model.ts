/**
 * Edge WatermelonDB Model
 *
 * Represents a directed hyperedge connecting source Node(s) to a target Node.
 * Maps between the database schema and the Edge domain entity.
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';
import type { Edge, EdgeSource, EdgeType } from '../../../domain';

/**
 * Sanitizer for the sources JSON field.
 * Ensures the data is always a valid array of EdgeSource objects.
 */
function sanitizeSources(rawSources: unknown): EdgeSource[] {
  if (!Array.isArray(rawSources)) {
    return [];
  }

  return rawSources.filter(
    (source): source is EdgeSource =>
      typeof source === 'object' &&
      source !== null &&
      typeof source.nodeId === 'string' &&
      typeof source.role === 'string'
  );
}

/**
 * WatermelonDB model for Edge entities.
 *
 * Edges are hyperedges that can have multiple sources (for complex generation
 * or Buffer Mode versioning) pointing to a single target node.
 */
export default class EdgeModel extends Model {
  static table = 'edges';

  /** Reference to parent LoomTree */
  @field('loom_tree_id') loomTreeId!: string;

  /** Source nodes with roles (stored as JSON) */
  @json('sources', sanitizeSources) sources!: EdgeSource[];

  /** Reference to the target Node */
  @field('target_node_id') targetNodeId!: string;

  /** Edge type: 'continuation' or 'annotation' */
  @field('edge_type') edgeType!: EdgeType;

  /** Creation timestamp */
  @readonly @date('created_at') createdAt!: Date;

  /**
   * Convert this model to a domain Edge entity.
   */
  toEntity(): Edge {
    return {
      id: this.id,
      loomTreeId: this.loomTreeId,
      sources: this.sources,
      targetNodeId: this.targetNodeId,
      edgeType: this.edgeType,
      createdAt: this.createdAt.getTime(),
    };
  }
}
