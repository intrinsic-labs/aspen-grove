import { Model, Query } from '@nozbe/watermelondb';
import {
  children,
  date,
  field,
  immutableRelation,
  text,
} from '@nozbe/watermelondb/decorators';

/**
 * Persistence model (Infrastructure).
 *
 * Invariants / conventions:
 * - `@date()` fields are JS `Date` objects (backed by numeric timestamps in SQLite).
 * - `@children()` requires a corresponding `has_many` association in `static associations`.
 * - Relations are typed as `Model`/`Query<Model>` until related models are introduced.
 */
export default class Grove extends Model {
  static table = 'groves';

  static associations = {
    agents: { type: 'belongs_to', key: 'owner_agent_id' },
    loom_trees: { type: 'has_many', foreignKey: 'grove_id' },
  } as const;

  @text('name') name!: string;

  @field('owner_agent_id') ownerAgentId!: string;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @immutableRelation('agents', 'owner_agent_id') owner!: Model;

  @children('loom_trees') loomTrees!: Query<Model>;
}
