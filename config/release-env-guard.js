// Fails a release build that carries a developer's provider key or a provider
// endpoint override.
//
// `EXPO_PUBLIC_*` values can be inlined into the JS bundle. The two keys are
// the env fallbacks in src/interface/components/chat/provider-key.ts: fine in a
// local dev build, a leaked key in anything that ships. The two endpoints
// point Anthropic and OpenAI at a local mock (src/interface/composition/
// direct-provider-endpoints.ts) and would send a user's key to that address. Today's dynamic read
// keeps them out of a release bundle, but one static `process.env.X` would not,
// so the build refuses them outright.
//
// EAS sets EAS_BUILD_PROFILE on the builder, where the app config is evaluated
// with every way a value can arrive: EAS environment variables, the profile's
// `env` in eas.json, and a committed .env file. Only dev-client profiles, which
// load JS from Metro and never embed a bundle, may carry them.

const RELEASE_FORBIDDEN_ENV = [
  'EXPO_PUBLIC_OPENROUTER_API_KEY',
  'EXPO_PUBLIC_LMSTUDIO_API_TOKEN',
  'EXPO_PUBLIC_ANTHROPIC_ENDPOINT',
  'EXPO_PUBLIC_OPENAI_ENDPOINT',
];

const DEV_CLIENT_PROFILES = new Set(['development', 'development-simulator']);

/** Names of the forbidden variables set for a release profile, else []. */
const findReleaseEnvLeaks = (env) => {
  const profile = env.EAS_BUILD_PROFILE;
  if (!profile || DEV_CLIENT_PROFILES.has(profile)) {
    return [];
  }
  return RELEASE_FORBIDDEN_ENV.filter(
    (name) => (env[name] ?? '').trim() !== ''
  );
};

/** Throws, naming the variables but never their values, when a release would leak. */
const assertReleaseEnvClean = (env) => {
  const leaks = findReleaseEnvLeaks(env);
  if (leaks.length > 0) {
    throw new Error(
      `Refusing the "${env.EAS_BUILD_PROFILE}" build: ${leaks.join(', ')} ` +
        'would be shipped in the app. Remove it from the EAS environment, ' +
        'eas.json and any .env file. Keys belong in the app, entered by the user.'
    );
  }
};

module.exports = {
  RELEASE_FORBIDDEN_ENV,
  findReleaseEnvLeaks,
  assertReleaseEnvClean,
};
