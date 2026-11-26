import type { Provider } from '@domain/entities';

type DirectProvider = Extract<Provider, 'anthropic' | 'openai'>;

const ENDPOINT_ENV: Record<DirectProvider, string> = {
  anthropic: 'EXPO_PUBLIC_ANTHROPIC_ENDPOINT',
  openai: 'EXPO_PUBLIC_OPENAI_ENDPOINT',
};

type Env = Readonly<Record<string, string | undefined>>;

/**
 * Where a development build sends Anthropic or OpenAI requests instead of the
 * real API: the full completion URL of a local mock, such as
 * `http://localhost:1236/v1/messages` (scripts/mock-llm-server). Read
 * dynamically, as provider-key.ts does, so a release bundle never carries it;
 * the release-env guard refuses these variables for release builds as well.
 * `undefined` leaves the provider on its real endpoint.
 */
export const directProviderEndpoint = (
  provider: DirectProvider,
  env: Env | undefined = (globalThis as { process?: { env?: Env } }).process
    ?.env,
  isDevelopmentBuild: boolean = __DEV__
): string | undefined => {
  if (!isDevelopmentBuild) {
    return undefined;
  }
  const value = env?.[ENDPOINT_ENV[provider]]?.trim();
  return value ? value : undefined;
};
