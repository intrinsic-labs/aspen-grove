import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const aspenGroveSchema = appSchema({
  version: 2,
  tables: [
    /**
     * Grove table schema
     */
    tableSchema({
      name: 'groves',
      columns: [
        // NOTE: WatermelonDB provides `Model.id` automatically, but keeping an explicit `id`
        // column can be useful for clarity and interoperability. If you hit issues with this,
        // remove the column and rely on Watermelon's built-in `id`.
        { name: 'id', type: 'string' },

        { name: 'name', type: 'string' },
        { name: 'owner_agent_id', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    /**
     * UserPreferences singleton table schema
     */
    tableSchema({
      name: 'user_preferences',
      columns: [
        { name: 'id', type: 'string' },

        { name: 'display_name', type: 'string', isOptional: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'avatar_ref', type: 'string', isOptional: true },

        { name: 'theme', type: 'string' },
        { name: 'font_size', type: 'number' },
        { name: 'font_face', type: 'string', isOptional: true },

        { name: 'default_voice_mode_enabled', type: 'boolean' },
        { name: 'default_temperature', type: 'number' },

        { name: 'node_view_style', type: 'string' },
        { name: 'node_view_corner_radius', type: 'number' },

        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    /**
     * Agent table schema
     *
     * Domain intent:
     * - `modelRef` is optional (required for model agents, absent for human agents)
     * - `configuration` and `permissions` are always present in the domain, but can be stored
     *   as serialized JSON. We'll allow optionality here to support gradual migration / defaults.
     *
     * Query intent:
     * - `findLoomAware()` should be fast without JSON parsing, so we denormalize loomAware into a column.
     * - `findAll(onlyActive, type)` needs agent_type and archived_at.
     * - `findByModelRef()` needs model_ref.
     */
    tableSchema({
      name: 'agents',
      columns: [
        { name: 'id', type: 'string' },

        { name: 'name', type: 'string' },
        { name: 'agent_type', type: 'string' },

        // Optional in domain; set `isOptional` to avoid forcing empty-string semantics
        { name: 'model_ref', type: 'string', isOptional: true },

        // Stored as JSON string. Optional at storage-level; repository can default to {}
        { name: 'configuration', type: 'string', isOptional: true },

        // Stored as JSON string. Optional at storage-level; repository can default to a full permissions object
        { name: 'permissions', type: 'string', isOptional: true },

        // Denormalized for fast querying (source of truth remains permissions JSON)
        { name: 'loom_aware', type: 'boolean', isOptional: true },

        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'archived_at', type: 'number', isOptional: true },
      ],
    }),

    /**
     * Loom Tree table schema
     *
     * Query intent:
     * - `findByGroveId(groveId, onlyActive, limit, offset)` needs grove_id + archived_at
     * - `findByMode(groveId, mode, onlyActive, limit, offset)` needs grove_id + mode + archived_at
     */
    tableSchema({
      name: 'loom_trees',
      columns: [
        { name: 'id', type: 'string' },

        { name: 'grove_id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'summary', type: 'string', isOptional: true },
        { name: 'root_node_id', type: 'string' },
        { name: 'mode', type: 'string' },
        { name: 'system_context', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'archived_at', type: 'number', isOptional: true },
      ],
    }),

    /**
     * Node table schema
     *
     * Domain intent:
     * - `summary` optional
     * - `edited_from` optional
     * - `content` and `metadata` are structured (stored as JSON string)
     *
     * Query intent (from INodeRepository):
     * - by id / local_id / loom_tree_id
     * - filter by pruned (includePruned flag) and by author_type
     * - findBookmarked() => bookmarked flag
     * - findPruned() => pruned flag
     * - findByAuthorAgentId() => author_agent_id (+ optional loom_tree_id, + optional pruned filter)
     * - findByEditedFrom() => edited_from
     *
     * To support these efficiently, we denormalize frequently queried metadata fields into columns.
     */
    tableSchema({
      name: 'nodes',
      columns: [
        { name: 'id', type: 'string' },

        { name: 'local_id', type: 'string' },
        { name: 'loom_tree_id', type: 'string' },

        // Stored as JSON string
        { name: 'content', type: 'string' },

        { name: 'summary', type: 'string', isOptional: true },

        { name: 'author_agent_id', type: 'string' },
        { name: 'author_type', type: 'string' },

        { name: 'content_hash', type: 'string' },
        { name: 'created_at', type: 'number' },

        // Stored as JSON string (keep for full fidelity)
        { name: 'metadata', type: 'string', isOptional: true },

        // Denormalized metadata flags for querying
        { name: 'bookmarked', type: 'boolean', isOptional: true },
        { name: 'bookmark_label', type: 'string', isOptional: true },
        { name: 'pruned', type: 'boolean', isOptional: true },
        { name: 'excluded', type: 'boolean', isOptional: true },

        // Versioning
        // Group identifier shared across a logical node "position" and all its edited versions.
        // Original node: version_group_id === id
        // Edited node: version_group_id === original.version_group_id
        { name: 'version_group_id', type: 'string', isOptional: true },

        { name: 'edited_from', type: 'string', isOptional: true },
      ],
    }),

    /**
     * Edge table schema
     *
     * Hyperedge design:
     * - `edges` stores the target node and edge type
     * - `edge_sources` is a join table with one row per (edge, source node, role)
     *
     * Query intent (from IEdgeRepository):
     * - findByLoomTreeId
     * - findByTargetNodeId
     * - findBySourceNodeId (enabled by join table)
     * - add/remove source efficiently without JSON scanning
     */
    tableSchema({
      name: 'edges',
      columns: [
        { name: 'id', type: 'string' },

        { name: 'loom_tree_id', type: 'string' },
        { name: 'target_node_id', type: 'string' },
        { name: 'edge_type', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),

    /**
     * EdgeSource join table schema
     *
     * One row per edge source.
     */
    tableSchema({
      name: 'edge_sources',
      columns: [
        { name: 'id', type: 'string' },

        { name: 'edge_id', type: 'string' },
        { name: 'source_node_id', type: 'string' },
        { name: 'role', type: 'string' },
      ],
    }),

    /**
     * Path table schema
     *
     * A persisted, agent-owned view through a LoomTree.
     * Shared across UI modes; mode-specific cursor lives in `path_states`.
     */
    tableSchema({
      name: 'paths',
      columns: [
        { name: 'id', type: 'string' },

        { name: 'loom_tree_id', type: 'string' },
        { name: 'owner_agent_id', type: 'string' },
        { name: 'name', type: 'string', isOptional: true },

        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'archived_at', type: 'number', isOptional: true },
      ],
    }),

    /**
     * PathNodes table schema
     *
     * Materialized ordered node sequence for a Path. Updated incrementally.
     */
    tableSchema({
      name: 'path_nodes',
      columns: [
        { name: 'id', type: 'string' },

        { name: 'path_id', type: 'string' },
        { name: 'position', type: 'number' },
        { name: 'node_id', type: 'string' },

        { name: 'created_at', type: 'number' },
      ],
    }),

    /**
     * PathSelections table schema
     *
     * Disambiguation choices for resolving a permissive graph deterministically within a Path.
     */
    tableSchema({
      name: 'path_selections',
      columns: [
        { name: 'id', type: 'string' },

        { name: 'path_id', type: 'string' },
        { name: 'target_node_id', type: 'string' },

        // For DAG/merge: choose which incoming continuation edge is active
        { name: 'selected_edge_id', type: 'string', isOptional: true },

        // For hyperedges: choose which source node is active for the chosen edge
        { name: 'selected_source_node_id', type: 'string', isOptional: true },

        { name: 'updated_at', type: 'number' },
      ],
    }),

    /**
     * PathStates table schema
     *
     * Fast-changing cursor state for a Path.
     * Mode is optional; if set, you can store separate cursors per mode while sharing the same Path.
     */
    tableSchema({
      name: 'path_states',
      columns: [
        { name: 'id', type: 'string' },

        { name: 'path_id', type: 'string' },
        { name: 'agent_id', type: 'string' },
        { name: 'mode', type: 'string', isOptional: true },
        { name: 'active_node_id', type: 'string' },

        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
