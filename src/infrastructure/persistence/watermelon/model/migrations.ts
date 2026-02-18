import {
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
      ],
    },
  ],
});
