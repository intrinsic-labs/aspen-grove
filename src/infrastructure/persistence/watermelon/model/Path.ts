import { Model, Query } from '@nozbe/watermelondb';
import {
  children,
  date,
  field,
  immutableRelation,
  relation,
  text,
} from '@nozbe/watermelondb/decorators';

/**
 * Persistence models (Infrastructure) for persisted path state.
 *
 * Tables (see schema.ts):
 * - paths
 * - path_nodes
 * - path_selections
 * - path_states
 *
 * Conventions / invariants:
 * - `@date()` fields are JS `Date` objects (backed by numeric timestamps in SQLite).
 * - Path is mode-agnostic and shared across modes; PathState may optionally be mode-scoped.
 * - `path_nodes` is a materialized ordered sequence, typically updated incrementally by repositories.
 *
 * Note:
 * - WatermelonDB does not enforce uniqueness constraints; repository should enforce invariants like:
 *   - (path_id, position) unique
 *   - (path_id, target_node_id) unique in path_selections
 *   - (path_id, mode) unique in path_states (mode may be null/undefined for shared cursor)
 */

/**
 * Path model (table: `paths`)
 *
 * A persisted, agent-owned view through a LoomTree.
 */
export class Path extends Model {
  static table = 'paths';

  static associations = {
    loom_trees: { type: 'belongs_to', key: 'loom_tree_id' },
    agents: { type: 'belongs_to', key: 'owner_agent_id' },
    path_nodes: { type: 'has_many', foreignKey: 'path_id' },
    path_selections: { type: 'has_many', foreignKey: 'path_id' },
    path_states: { type: 'has_many', foreignKey: 'path_id' },
  } as const;

  @field('loom_tree_id') loomTreeId!: string;

  @field('owner_agent_id') ownerAgentId!: string;

  @text('name') name!: string | null;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('archived_at') archivedAt!: Date | null;

  // Relations
  @immutableRelation('loom_trees', 'loom_tree_id') loomTree!: Model;
  @immutableRelation('agents', 'owner_agent_id') ownerAgent!: Model;

  // Children
  @children('path_nodes') nodes!: Query<PathNode>;
  @children('path_selections') selections!: Query<PathSelection>;
  @children('path_states') states!: Query<PathState>;
}

/**
 * PathNode model (table: `path_nodes`)
 *
 * Materialized, ordered node sequence for a Path.
 */
export class PathNode extends Model {
  static table = 'path_nodes';

  static associations = {
    paths: { type: 'belongs_to', key: 'path_id' },
    nodes: { type: 'belongs_to', key: 'node_id' },
  } as const;

  @field('path_id') pathId!: string;

  @field('position') position!: number;

  @field('node_id') nodeId!: string;

  @date('created_at') createdAt!: Date;

  // Relations
  @immutableRelation('paths', 'path_id') path!: Path;
  @immutableRelation('nodes', 'node_id') node!: Model;
}

/**
 * PathSelection model (table: `path_selections`)
 *
 * Disambiguation choice for resolving a permissive graph deterministically within a Path.
 *
 * Use cases:
 * - Multiple incoming continuation edges: choose `selectedEdgeId` for a given target node
 * - Hyperedges: choose `selectedSourceNodeId` (optionally within the chosen edge)
 */
export class PathSelection extends Model {
  static table = 'path_selections';

  static associations = {
    paths: { type: 'belongs_to', key: 'path_id' },
    nodes: { type: 'belongs_to', key: 'target_node_id' },
    edges: { type: 'belongs_to', key: 'selected_edge_id' },
    source_nodes: { type: 'belongs_to', key: 'selected_source_node_id' },
  } as const;

  @field('path_id') pathId!: string;

  @field('target_node_id') targetNodeId!: string;

  @field('selected_edge_id') selectedEdgeId!: string | null;

  @field('selected_source_node_id') selectedSourceNodeId!: string | null;

  @date('updated_at') updatedAt!: Date;

  // Relations
  @immutableRelation('paths', 'path_id') path!: Path;

  @immutableRelation('nodes', 'target_node_id') targetNode!: Model;

  // These are optional FKs; use `@relation` rather than immutable relation
  // because they can be null and may be updated over time.
  @relation('edges', 'selected_edge_id') selectedEdge!: Model;

  @relation('nodes', 'selected_source_node_id') selectedSourceNode!: Model;
}

/**
 * PathState model (table: `path_states`)
 *
 * Fast-changing cursor state for a Path.
 * Mode is optional; if set, you can persist separate cursors per mode while sharing the same Path.
 */
export class PathState extends Model {
  static table = 'path_states';

  static associations = {
    paths: { type: 'belongs_to', key: 'path_id' },
    agents: { type: 'belongs_to', key: 'agent_id' },
    nodes: { type: 'belongs_to', key: 'active_node_id' },
  } as const;

  @field('path_id') pathId!: string;

  @field('agent_id') agentId!: string;

  @field('mode') mode!: string | null;

  @field('active_node_id') activeNodeId!: string;

  @date('updated_at') updatedAt!: Date;

  // Relations
  @immutableRelation('paths', 'path_id') path!: Path;
  @immutableRelation('agents', 'agent_id') agent!: Model;
  @immutableRelation('nodes', 'active_node_id') activeNode!: Model;
}
