import { Model, Query } from '@nozbe/watermelondb';
import {
  children,
  date,
  field,
  immutableRelation,
} from '@nozbe/watermelondb/decorators';

/**
 * Persistence models (Infrastructure) for hyperedges.
 *
 * Design:
 * - `edges` is the edge record (target, type, tree).
 * - `edge_sources` is a join table: one row per (edge, source node, role).
 *
 * Why a join table?
 * - Enables fast query patterns required by `IEdgeRepository`:
 *   - find by source node id
 *   - add/remove a source
 *   - avoid JSON array scans for hyperedge sources
 *
 * Conventions:
 * - `@date()` fields are JS `Date` objects (backed by numeric timestamps in SQLite).
 * - `@children()` requires a corresponding `has_many` association in `static associations`.
 * - Most relations are marked immutable: edges/sources should not change identity, only be created/deleted.
 */

/**
 * Edge model (table: `edges`)
 */
export class Edge extends Model {
  static table = 'edges';

  static associations = {
    loom_trees: { type: 'belongs_to', key: 'loom_tree_id' },
    nodes: { type: 'belongs_to', key: 'target_node_id' },
    edge_sources: { type: 'has_many', foreignKey: 'edge_id' },
  } as const;

  @field('loom_tree_id') loomTreeId!: string;

  @field('target_node_id') targetNodeId!: string;

  @field('edge_type') edgeType!: string;

  @date('created_at') createdAt!: Date;

  // Relations
  @immutableRelation('loom_trees', 'loom_tree_id') loomTree!: Model;
  @immutableRelation('nodes', 'target_node_id') targetNode!: Model;

  // Children (hyperedge sources)
  @children('edge_sources') sources!: Query<EdgeSource>;
}

/**
 * EdgeSource model (table: `edge_sources`)
 *
 * One row per edge source:
 * - `edge_id` references Edge
 * - `source_node_id` references Node
 * - `role` describes the source role (domain enum SourceRole)
 */
export class EdgeSource extends Model {
  static table = 'edge_sources';

  static associations = {
    edges: { type: 'belongs_to', key: 'edge_id' },
    nodes: { type: 'belongs_to', key: 'source_node_id' },
  } as const;

  @field('edge_id') edgeId!: string;

  @field('source_node_id') sourceNodeId!: string;

  @field('role') role!: string;

  // Relations
  @immutableRelation('edges', 'edge_id') edge!: Edge;
  @immutableRelation('nodes', 'source_node_id') sourceNode!: Model;
}
