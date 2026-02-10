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
 * Persistence model (Infrastructure).
 *
 * Invariants / conventions:
 * - `@date()` fields are JS `Date` objects (backed by numeric timestamps in SQLite).
 * - `@children()` requires a corresponding `has_many` association in `static associations`.
 * - Root-node correctness is enforced by application/domain logic (the DB only stores `rootNodeId`).
 */
export default class LoomTree extends Model {
  static table = 'loom_trees';

  static associations = {
    groves: { type: 'belongs_to', key: 'grove_id' },
    nodes: { type: 'has_many', foreignKey: 'loom_tree_id' },
    edges: { type: 'has_many', foreignKey: 'loom_tree_id' }, // future-proof (when you add edges)
  } as const;

  // === Fields ===

  @field('grove_id') groveId!: string;

  @text('title') title!: string;

  @text('description') description!: string | null;

  @text('summary') summary!: string | null;

  @field('root_node_id') rootNodeId!: string;

  @field('mode') mode!: string;

  @text('system_context') systemContext!: string | null;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('archived_at') archivedAt!: Date | null;

  // === Relations ===

  /**
   * Grove that this LoomTree belongs to (to-one).
   *
   * This uses `@immutableRelation` because a tree's grove ownership is typically stable.
   * If you intend to support moving trees across groves, switch to `@relation`.
   */
  @immutableRelation('groves', 'grove_id') grove!: Model;

  /**
   * Root node (to-one).
   *
   * This is a "special" reference: nodes also belong to a loom_tree, so the existence
   * and correctness of the root is enforced by application/domain logic.
   *
   * Use `@relation` (not immutable) in case you ever support changing the root node
   * as part of a repair/migration flow.
   */
  @relation('nodes', 'root_node_id') rootNode!: Model;

  // === Children ===

  /**
   * Nodes in this LoomTree (to-many).
   *
   * Returns a Query you can `fetch()`, `observe()`, `count`, or further `extend()`.
   */
  @children('nodes') nodes!: Query<Model>;
}
