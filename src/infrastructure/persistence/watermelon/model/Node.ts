import { Model } from '@nozbe/watermelondb';
import {
  date,
  field,
  immutableRelation,
  json,
  relation,
  text,
} from '@nozbe/watermelondb/decorators';

/**
 * Persistence model (Infrastructure).
 *
 * Invariants / conventions:
 * - `@date()` fields are JS `Date` objects (backed by numeric timestamps in SQLite).
 * - `content` and `metadata` are stored as JSON strings.
 * - Metadata is denormalized into columns for fast querying (`bookmarked`, `pruned`, etc.).
 *   Repository (write layer) must keep JSON + denormalized columns in sync.
 * - Versioning uses `versionGroupId` to group a logical node "position" and all its edited versions.
 *   Repository should enforce:
 *   - Original node: versionGroupId === id
 *   - Edited node: versionGroupId === editedFrom.versionGroupId
 * - `@json()` uses sanitizers so malformed values don't break persistence.
 */
export default class Node extends Model {
  static table = 'nodes';

  static associations = {
    loom_trees: { type: 'belongs_to', key: 'loom_tree_id' },
    agents: { type: 'belongs_to', key: 'author_agent_id' },
    nodes: { type: 'belongs_to', key: 'edited_from' }, // self-reference (optional)
    // Edges are intentionally omitted for now. When introduced, we'll likely model:
    // - edges: Edge records
    // - edge_sources: join table for hyperedge sources
    // and expose incoming/outgoing via custom queries (not just @children).
  } as const;

  @field('local_id') localId!: string;

  @field('loom_tree_id') loomTreeId!: string;

  @json('content', sanitizeJsonValue)
  content!: unknown;

  @text('summary') summary!: string | null;

  @field('author_agent_id') authorAgentId!: string;

  @field('author_type') authorType!: string;

  @field('content_hash') contentHash!: string;

  @date('created_at') createdAt!: Date;

  @json('metadata', sanitizeJsonObject)
  metadata!: Record<string, unknown> | null;

  @field('bookmarked') bookmarked!: boolean | null;
  @field('bookmark_label') bookmarkLabel!: string | null;
  @field('pruned') pruned!: boolean | null;
  @field('excluded') excluded!: boolean | null;

  @field('version_group_id') versionGroupId!: string | null;

  @field('edited_from') editedFrom!: string | null;

  @immutableRelation('loom_trees', 'loom_tree_id') loomTree!: Model;

  @immutableRelation('agents', 'author_agent_id') author!: Model;

  @relation('nodes', 'edited_from') editedFromNode!: Model;
}

function sanitizeJsonValue(raw: unknown): unknown {
  if (raw === undefined) return null;
  if (typeof raw === 'function') return null;
  if (typeof raw === 'symbol') return null;
  return raw;
}

function sanitizeJsonObject(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  if (Array.isArray(raw)) return null;

  const proto = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) return null;

  return raw as Record<string, unknown>;
}
