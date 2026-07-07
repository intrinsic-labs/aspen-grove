export type DatabaseSetupErrorListener = (error: Error) => void;

let databaseSetupError: Error | null = null;
const listeners = new Set<DatabaseSetupErrorListener>();

/**
 * Records a WatermelonDB setup failure (e.g. corrupted database file).
 *
 * Called from the SQLite adapter's `onSetUpError` hook so the interface layer
 * can surface the failure to the user instead of it staying silent.
 */
export const recordDatabaseSetupError = (error: Error): void => {
  databaseSetupError = error;
  for (const listener of listeners) {
    listener(error);
  }
};

/** Returns the captured database setup error, or null when setup succeeded. */
export const getDatabaseSetupError = (): Error | null => databaseSetupError;

/**
 * Subscribes to database setup errors. If an error was already recorded,
 * the listener is invoked immediately. Returns an unsubscribe function.
 */
export const subscribeToDatabaseSetupError = (
  listener: DatabaseSetupErrorListener
): (() => void) => {
  listeners.add(listener);
  if (databaseSetupError) {
    listener(databaseSetupError);
  }
  return () => {
    listeners.delete(listener);
  };
};
