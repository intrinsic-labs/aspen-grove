import {
  addColumns,
  schemaMigrations,
  createTable,
  unsafeExecuteSql,
} from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'user_preferences',
          columns: [
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
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'user_preferences',
          columns: [
            { name: 'verbose_error_alerts', type: 'boolean', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        createTable({
          name: 'raw_api_responses',
          columns: [
            { name: 'node_id', type: 'string', isIndexed: true },
            { name: 'provider', type: 'string', isIndexed: true },
            { name: 'request_id', type: 'string', isOptional: true },
            { name: 'model_identifier', type: 'string' },
            { name: 'response_body', type: 'string' },
            { name: 'response_headers', type: 'string' },
            { name: 'request_timestamp', type: 'number', isIndexed: true },
            { name: 'response_timestamp', type: 'number' },
            { name: 'latency_ms', type: 'number' },
            { name: 'token_usage', type: 'string', isOptional: true },
            { name: 'compression_type', type: 'string' },
            { name: 'created_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'user_preferences',
          columns: [
            { name: 'selected_provider', type: 'string', isOptional: true },
            { name: 'lmstudio_settings', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      // v6: Pivot from global provider selection to per-tree agent references.
      // - Adds `agents.owner_tree_id` for tree-owned (ad-hoc) agents.
      // - Adds `loom_trees.default_model_agent_id` for the agent that generates
      //   when the user hits send.
      // Note: `user_preferences.selected_provider` is no longer used at v6 but
      // the column is not dropped (WatermelonDB has no dropColumn). It will
      // simply be ignored by the repository.
      toVersion: 6,
      steps: [
        addColumns({
          table: 'agents',
          columns: [
            {
              name: 'owner_tree_id',
              type: 'string',
              isOptional: true,
              isIndexed: true,
            },
          ],
        }),
        addColumns({
          table: 'loom_trees',
          columns: [
            {
              name: 'default_model_agent_id',
              type: 'string',
              isOptional: true,
              isIndexed: true,
            },
          ],
        }),
      ],
    },
    {
      // v7: User-pinned default model Agent for new trees.
      // Adds `user_preferences.default_model_agent_id`. Tree creation reads
      // this to decide which agent a fresh tree references; unset means
      // "fall back to any available shared model agent."
      toVersion: 7,
      steps: [
        addColumns({
          table: 'user_preferences',
          columns: [
            {
              name: 'default_model_agent_id',
              type: 'string',
              isOptional: true,
            },
          ],
        }),
      ],
    },
    {
      // v8: Milestone C.
      // - `loom_trees.last_message_at` tracks the latest dialogue turn for
      //   recency sorting (updated_at also moves on metadata edits).
      // - `user_preferences.auto_title_enabled` gates the AI-generated
      //   conversation title after the first model response.
      // - `tags` / `tag_assignments` tables back the (previously
      //   interface-only) ITagRepository.
      // - Index on `nodes.loom_tree_id` for per-tree queries (search, export,
      //   latest-message lookups). Name matches WatermelonDB's
      //   `{table}_{column}` convention so fresh installs and migrated
      //   databases converge on the same index.
      toVersion: 8,
      steps: [
        addColumns({
          table: 'loom_trees',
          columns: [
            { name: 'last_message_at', type: 'number', isOptional: true },
          ],
        }),
        addColumns({
          table: 'user_preferences',
          columns: [
            { name: 'auto_title_enabled', type: 'boolean', isOptional: true },
          ],
        }),
        createTable({
          name: 'tags',
          columns: [
            { name: 'grove_id', type: 'string', isIndexed: true },
            { name: 'name', type: 'string' },
            { name: 'color', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'tag_assignments',
          columns: [
            { name: 'tag_id', type: 'string', isIndexed: true },
            { name: 'target_type', type: 'string' },
            { name: 'target_id', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
          ],
        }),
        unsafeExecuteSql(
          'create index if not exists "nodes_loom_tree_id" on "nodes" ("loom_tree_id");'
        ),
      ],
    },
  ],
});
