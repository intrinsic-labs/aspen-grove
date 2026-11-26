import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import schema from '../model/schema';
import migrations from '../model/migrations';
import Grove from '../model/Grove';
import Agent from '../model/Agent';
import LoomTree from '../model/LoomTree';
import Node from '../model/Node';
import UserPreferences from '../model/UserPreferences';
import { Edge, EdgeSource } from '../model/Edge';
import { Path, PathNode, PathSelection, PathState } from '../model/Path';
import RawApiResponse from '../model/RawApiResponse';
import { Tag, TagAssignment } from '../model/Tag';

export function bufferTestDatabase() {
  const adapter = new LokiJSAdapter({
    schema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    extraLokiOptions: { autosave: false },
  });
  return new Database({
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
      Tag,
      TagAssignment,
    ],
  });
}
