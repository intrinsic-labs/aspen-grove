import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * WatermelonDB Schema for Aspen Grove
 *
 * This schema defines all tables and their columns for local persistence.
 * Column types: 'string' | 'number' | 'boolean'
 *
 * Note: WatermelonDB uses snake_case for column names by convention.
 * Our domain entities use camelCase, so mapping happens in the Model classes.
 */

export const schema = appSchema({
  version: 1,
  tables: [
    // ============================================
    // Core Entities
    // ============================================

    tableSchema({
      name: 'groves',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'owner_agent_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'loom_trees',
      columns: [
        { name: 'grove_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'summary', type: 'string', isOptional: true },
        { name: 'root_node_id', type: 'string' },
        { name: 'mode', type: 'string' }, // 'dialogue' | 'buffer'
        { name: 'system_context', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number' },
        { name: 'archived_at', type: 'number', isOptional: true, isIndexed: true },
      ],
    }),

    tableSchema({
      name: 'nodes',
      columns: [
        { name: 'local_id', type: 'string' },
        { name: 'loom_tree_id', type: 'string', isIndexed: true },
        // Content stored as JSON string
        { name: 'content', type: 'string' },
        { name: 'summary', type: 'string', isOptional: true },
        { name: 'author_agent_id', type: 'string', isIndexed: true },
        { name: 'author_type', type: 'string', isIndexed: true }, // 'human' | 'model'
        { name: 'content_hash', type: 'string' },
        { name: 'created_at', type: 'number', isIndexed: true },
        // Metadata fields (flattened from NodeMetadata)
        { name: 'bookmarked', type: 'boolean', isIndexed: true },
        { name: 'bookmark_label', type: 'string', isOptional: true },
        { name: 'pruned', type: 'boolean' },
        { name: 'excluded', type: 'boolean' },
        // Buffer Mode version relationship
        { name: 'edited_from', type: 'string', isOptional: true, isIndexed: true },
      ],
    }),

    tableSchema({
      name: 'edges',
      columns: [
        { name: 'loom_tree_id', type: 'string', isIndexed: true },
        // Sources stored as JSON array of EdgeSource objects
        { name: 'sources', type: 'string' },
        { name: 'target_node_id', type: 'string', isIndexed: true },
        { name: 'edge_type', type: 'string' }, // 'continuation' | 'annotation'
        { name: 'created_at', type: 'number' },
      ],
    }),

    // ============================================
    // Agent Entities
    // ============================================

    tableSchema({
      name: 'agents',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string', isIndexed: true }, // 'human' | 'model'
        // For model agents: 'provider:identifier' or 'local:ulid'
        { name: 'model_ref', type: 'string', isOptional: true, isIndexed: true },
        // Configuration stored as JSON
        { name: 'configuration', type: 'string' },
        // Permissions stored as JSON
        { name: 'permissions', type: 'string' },
        { name: 'loom_aware', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'archived_at', type: 'number', isOptional: true, isIndexed: true },
      ],
    }),

    tableSchema({
      name: 'user_preferences',
      columns: [
        { name: 'display_name', type: 'string' },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'avatar_ref', type: 'string', isOptional: true },
        { name: 'default_voice_mode_enabled', type: 'boolean' },
        { name: 'default_temperature', type: 'number', isOptional: true },
        { name: 'theme', type: 'string' }, // 'light' | 'dark' | 'system'
        { name: 'font_size', type: 'number' },
        { name: 'font_face', type: 'string' },
        { name: 'node_view_style', type: 'string' }, // 'filled' | 'outlined'
        { name: 'node_view_corner_radius', type: 'number' },
        { name: 'verbose_error_alerts', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'local_models',
      columns: [
        { name: 'identifier', type: 'string', isIndexed: true },
        { name: 'provider', type: 'string', isIndexed: true }, // 'local' | 'custom'
        { name: 'endpoint', type: 'string' },
        // Auth config stored as JSON
        { name: 'auth_config', type: 'string', isOptional: true },
        // Capabilities stored as JSON
        { name: 'capabilities', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ============================================
    // Organization Entities
    // ============================================

    tableSchema({
      name: 'documents',
      columns: [
        { name: 'grove_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'summary', type: 'string', isOptional: true },
        // Blocks stored as JSON array
        { name: 'blocks', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number', isIndexed: true },
        { name: 'archived_at', type: 'number', isOptional: true, isIndexed: true },
      ],
    }),

    tableSchema({
      name: 'links',
      columns: [
        { name: 'grove_id', type: 'string', isIndexed: true },
        { name: 'source_type', type: 'string' }, // 'node' | 'loomTree' | 'document'
        { name: 'source_id', type: 'string', isIndexed: true },
        { name: 'target_type', type: 'string' }, // 'node' | 'loomTree' | 'document'
        { name: 'target_id', type: 'string', isIndexed: true },
        { name: 'label', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'tags',
      columns: [
        { name: 'grove_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'tag_assignments',
      columns: [
        { name: 'tag_id', type: 'string', isIndexed: true },
        { name: 'target_type', type: 'string' }, // 'node' | 'loomTree' | 'document'
        { name: 'target_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
      ],
    }),

    // ============================================
    // Provenance Entities
    // ============================================

    tableSchema({
      name: 'raw_api_responses',
      columns: [
        { name: 'node_id', type: 'string', isIndexed: true },
        { name: 'provider', type: 'string' },
        { name: 'request_id', type: 'string', isOptional: true },
        { name: 'model_identifier', type: 'string' },
        // Response body and headers stored compressed
        { name: 'response_body', type: 'string' },
        { name: 'response_headers', type: 'string' },
        { name: 'request_timestamp', type: 'number', isIndexed: true },
        { name: 'response_timestamp', type: 'number' },
        { name: 'latency_ms', type: 'number' },
        // Token usage stored as JSON
        { name: 'token_usage', type: 'string', isOptional: true },
        { name: 'compression_type', type: 'string' }, // 'none' | 'gzip'
        { name: 'created_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'timestamp_certificates',
      columns: [
        { name: 'node_id', type: 'string', isIndexed: true },
        { name: 'content_hash', type: 'string' },
        { name: 'timestamp_authority', type: 'string', isIndexed: true },
        { name: 'certificate', type: 'string' }, // Base64-encoded
        { name: 'timestamp', type: 'number' },
        { name: 'verified', type: 'boolean', isIndexed: true },
        { name: 'verified_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});

/**
 * Composite index definitions for common queries.
 *
 * Note: WatermelonDB doesn't support composite indexes directly in schema.
 * These are documented here for reference; we rely on individual column indexes
 * and query optimization in the repository layer.
 *
 * Logical composite indexes we need:
 * - nodes: (loom_tree_id, local_id) - unique within tree
 * - nodes: (loom_tree_id, created_at) - ordered traversal
 * - loom_trees: (grove_id, created_at) - listing/sorting
 * - tag_assignments: (tag_id, target_type, target_id) - unique constraint
 */
