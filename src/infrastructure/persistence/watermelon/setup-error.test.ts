import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type SetupErrorModule = typeof import('./setup-error');

describe('database setup error capture', () => {
  let module: SetupErrorModule;

  beforeEach(() => {
    jest.resetModules();
    // Re-import to reset the module-scoped error state between tests.
    module = require('./setup-error') as SetupErrorModule;
  });

  it('returns null when no setup error was recorded', () => {
    expect(module.getDatabaseSetupError()).toBeNull();
  });

  it('records the setup error and notifies subscribers', () => {
    const received: Error[] = [];
    module.subscribeToDatabaseSetupError((error) => received.push(error));

    const failure = new Error('database is corrupted');
    module.recordDatabaseSetupError(failure);

    expect(module.getDatabaseSetupError()).toBe(failure);
    expect(received).toEqual([failure]);
  });

  it('replays an already-recorded error to late subscribers', () => {
    const failure = new Error('database failed to open');
    module.recordDatabaseSetupError(failure);

    const received: Error[] = [];
    module.subscribeToDatabaseSetupError((error) => received.push(error));

    expect(received).toEqual([failure]);
  });

  it('stops notifying after unsubscribe', () => {
    const received: Error[] = [];
    const unsubscribe = module.subscribeToDatabaseSetupError((error) =>
      received.push(error)
    );
    unsubscribe();

    module.recordDatabaseSetupError(new Error('too late'));

    expect(received).toEqual([]);
  });
});
