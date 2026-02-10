import { Model, Query } from '@nozbe/watermelondb';
import {
  children,
  date,
  field,
  json,
  text,
} from '@nozbe/watermelondb/decorators';

/**
 * Persistence model (Infrastructure).
 *
 * Invariants / conventions:
 * - `@date()` fields are JS `Date` objects (backed by numeric timestamps in SQLite).
 * - `permissions` JSON is the semantic source of truth; `loomAware` is a denormalized column for fast queries.
 *   Repository (write layer) must keep them in sync.
 * - `@json()` uses sanitizers so malformed values don't break persistence.
 */
export default class Agent extends Model {
  static table = 'agents';

  static associations = {
    groves: { type: 'has_many', foreignKey: 'owner_agent_id' },
    nodes: { type: 'has_many', foreignKey: 'author_agent_id' },
  } as const;

  @text('name') name!: string;

  @field('agent_type') agentType!: string;

  @field('model_ref') modelRef!: string | null;

  @json('configuration', sanitizeJsonObject)
  configuration!: Record<string, unknown> | null;

  @json('permissions', sanitizeJsonValue)
  permissions!: unknown;

  @field('loom_aware') loomAware!: boolean | null;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('archived_at') archivedAt!: Date | null;

  @children('groves') groves!: Query<Model>;
  @children('nodes') nodes!: Query<Model>;
}

function sanitizeJsonObject(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  if (Array.isArray(raw)) return null;

  const proto = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) return null;

  return raw as Record<string, unknown>;
}

function sanitizeJsonValue(raw: unknown): unknown {
  if (raw === undefined) return null;
  if (typeof raw === 'function') return null;
  if (typeof raw === 'symbol') return null;
  return raw;
}
