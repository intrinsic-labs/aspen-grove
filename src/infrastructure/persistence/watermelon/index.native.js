import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './model/schema';
import migrations from './model/migrations';

import Grove from './model/Grove';
import Agent from './model/Agent';
import LoomTree from './model/LoomTree';
import Node from './model/Node';
import { Edge, EdgeSource } from './model/Edge';
import { Path, PathNode, PathSelection, PathState } from './model/Path';

const adapter = new SQLiteAdapter({
  schema,
  migrations, // possibly comment out during development
  dbName: 'aspen-grove-local',
  jsi: true /* Platform.OS === 'ios'  */,
  onSetUpError: (error) => {
    // db failed to load - notify user
  },
});

const database = new Database({
  adapter,
  modelClasses: [
    Grove,
    Agent,
    LoomTree,
    Node,
    Edge,
    EdgeSource,
    Path,
    PathNode,
    PathSelection,
    PathState,
  ],
});
