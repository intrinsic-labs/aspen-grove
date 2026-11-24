import { readFileSync } from 'fs';
import { join } from 'path';

const guard = require('./release-env-guard') as {
  RELEASE_FORBIDDEN_ENV: string[];
  findReleaseEnvLeaks: (env: Record<string, string | undefined>) => string[];
  assertReleaseEnvClean: (env: Record<string, string | undefined>) => void;
};

const KEY = 'EXPO_PUBLIC_OPENROUTER_API_KEY';

describe('release env guard', () => {
  it('fails a production build that carries a provider key, without printing it', () => {
    const env = { EAS_BUILD_PROFILE: 'production', [KEY]: 'sk-or-secret' };
    expect(() => guard.assertReleaseEnvClean(env)).toThrow(KEY);
    expect(() => guard.assertReleaseEnvClean(env)).not.toThrow('sk-or-secret');
  });

  it('treats preview as a release', () => {
    expect(
      guard.findReleaseEnvLeaks({
        EAS_BUILD_PROFILE: 'preview',
        EXPO_PUBLIC_LMSTUDIO_API_TOKEN: 'token',
      })
    ).toEqual(['EXPO_PUBLIC_LMSTUDIO_API_TOKEN']);
  });

  it('allows a release build without keys, and ignores blank values', () => {
    expect(() =>
      guard.assertReleaseEnvClean({
        EAS_BUILD_PROFILE: 'production',
        [KEY]: '  ',
      })
    ).not.toThrow();
  });

  it('allows keys in dev-client builds and outside EAS (local dev, Maestro)', () => {
    expect(
      guard.findReleaseEnvLeaks({
        EAS_BUILD_PROFILE: 'development',
        [KEY]: 'k',
      })
    ).toEqual([]);
    expect(
      guard.findReleaseEnvLeaks({
        EAS_BUILD_PROFILE: 'development-simulator',
        [KEY]: 'k',
      })
    ).toEqual([]);
    expect(guard.findReleaseEnvLeaks({ [KEY]: 'k' })).toEqual([]);
  });

  it('covers every EXPO_PUBLIC_ variable the app reads', () => {
    const read = [
      'src/interface/components/chat/provider-key.ts',
      'src/interface/composition/direct-provider-endpoints.ts',
    ].flatMap((file) => {
      const source = readFileSync(join(__dirname, '..', file), 'utf8');
      return [...source.matchAll(/'(EXPO_PUBLIC_[A-Z_]+)'/g)].map((m) => m[1]);
    });
    expect(read.length).toBeGreaterThan(0);
    expect([...guard.RELEASE_FORBIDDEN_ENV].sort()).toEqual([...read].sort());
  });
});
