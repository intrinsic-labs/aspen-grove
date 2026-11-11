import { aspenGroveSchema } from './schema';
import migrations from './migrations';

/**
 * Guards the upgrade path for installed databases. WatermelonDB migrates an
 * existing database step by step up to the schema version, so the last
 * migration must land exactly on it.
 */
describe('schema migrations', () => {
  it('end at the current schema version', () => {
    const versions = migrations.sortedMigrations.map((m) => m.toVersion);
    expect(Math.max(...versions)).toBe(aspenGroveSchema.version);
    expect(migrations.maxVersion).toBe(aspenGroveSchema.version);
  });

  it('keep nodes.author_type a plain string, so system nodes need no migration', () => {
    // The system node role is stored in the existing column; a v9 database
    // already accepts it, and v9 rows read back unchanged
    // (see repositories/node-author-type.test.ts).
    const column = aspenGroveSchema.tables.nodes.columns.author_type;
    expect(column).toEqual({ name: 'author_type', type: 'string' });
  });
});
