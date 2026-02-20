import {
  addColumns,
  schemaMigrations,
  createTable,
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
  ],
});
