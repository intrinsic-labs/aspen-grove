/**
 * WatermelonDB Database Configuration
 *
 * This module initializes and exports the WatermelonDB database instance.
 * All model classes are registered here for the ORM to function.
 */

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { modelClasses } from './models';

/**
 * SQLite adapter configuration for WatermelonDB
 *
 * This adapter provides the underlying SQLite storage for all local data.
 * The database file is stored in the app's document directory.
 */
const adapter = new SQLiteAdapter({
  schema,
  // Database file name (stored in app's documents directory)
  dbName: 'aspen_grove',
  // Enable JSI for better performance (React Native New Architecture)
  jsi: true,
  // Called when database needs to be set up or migrated
  onSetUpError: (error) => {
    console.error('[Database] Setup error:', error);
  },
});

/**
 * WatermelonDB database instance
 *
 * This is the main database instance used throughout the app.
 * All repository implementations use this instance for data access.
 *
 * Features:
 * - Local-first: All data is stored locally on device
 * - Lazy loading: Relations are loaded on demand
 * - Observable queries: UI automatically updates when data changes
 * - Sync-ready: Can be extended with sync adapters later
 */
export const database = new Database({
  adapter,
  modelClasses,
});

/**
 * Reset the database (for development/testing)
 *
 * WARNING: This will delete all data!
 * Only use during development or when explicitly requested by user.
 */
export async function resetDatabase(): Promise<void> {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
  console.log('[Database] Reset complete');
}

/**
 * Get database statistics for debugging
 */
export async function getDatabaseStats(): Promise<{
  groveCount: number;
  loomTreeCount: number;
  nodeCount: number;
  edgeCount: number;
  agentCount: number;
  documentCount: number;
}> {
  const groveCount = await database.get('groves').query().fetchCount();
  const loomTreeCount = await database.get('loom_trees').query().fetchCount();
  const nodeCount = await database.get('nodes').query().fetchCount();
  const edgeCount = await database.get('edges').query().fetchCount();
  const agentCount = await database.get('agents').query().fetchCount();
  const documentCount = await database.get('documents').query().fetchCount();

  return {
    groveCount,
    loomTreeCount,
    nodeCount,
    edgeCount,
    agentCount,
    documentCount,
  };
}

/**
 * Check if the database has been initialized (Grove exists)
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  const groveCount = await database.get('groves').query().fetchCount();
  return groveCount > 0;
}
