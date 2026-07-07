import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './model/schema';
import migrations from './model/migrations';
import { recordDatabaseSetupError } from './setup-error';

import Grove from './model/Grove';
import Agent from './model/Agent';
import LoomTree from './model/LoomTree';
import Node from './model/Node';
import UserPreferences from './model/UserPreferences';
import { Edge, EdgeSource } from './model/Edge';
import { Path, PathNode, PathSelection, PathState } from './model/Path';
import RawApiResponse from './model/RawApiResponse';

const adapter = new SQLiteAdapter({
  schema,
  migrations, // possibly comment out during development
  dbName: 'aspen-grove-local',
  // Intentionally enabled on both iOS and Android: WatermelonDB 0.28 supports
  // JSI on both platforms and falls back to the async bridge if unavailable.
  jsi: true,
  onSetUpError: (error) => {
    // db failed to load (likely persistent, e.g. corruption) - capture so the
    // interface layer can notify the user
    recordDatabaseSetupError(error);
  },
});

const database = new Database({
  adapter,
  modelClasses: [
    Grove,
    Agent,
    UserPreferences,
    LoomTree,
    Node,
    Edge,
    EdgeSource,
    Path,
    PathNode,
    PathSelection,
    PathState,
    RawApiResponse,
  ],
});

export {
  getDatabaseSetupError,
  recordDatabaseSetupError,
  subscribeToDatabaseSetupError,
} from './setup-error';

export { database };
export default database;
