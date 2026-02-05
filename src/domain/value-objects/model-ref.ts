import { Provider } from '../entities/provider';

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

/**
 * ModelRef type used to reference models in a type-safe way.
 *
 * See docs/architecture/model/provenance.md
 */
export type ModelRef = Brand<string, 'ModelRef'>;

const VALID_PROVIDERS: Provider[] = [
  'openrouter',
  'hyperbolic',
  'anthropic',
  'openai',
  'google',
  'local',
  'custom',
];

/**
 * Parses a string as a ModelRef.
 * Use when loading from database.
 *
 * ModelRef must be in the format `{provider}:{identifier}` or `local:{ulid}`
 */
export const parseModelRef = (value: string): ModelRef => {
  const trimmed = value.trim();
  if (trimmed.length === 0)
    throw new Error('ModelRef cannot be an empty string');

  const colonIndex = trimmed.indexOf(':');
  if (colonIndex === -1)
    throw new Error(
      'ModelRef must be in the format {provider}:{identifier} or local:{ulid}'
    );

  const provider = trimmed.slice(0, colonIndex);
  const identifier = trimmed.slice(colonIndex + 1);

  if (provider.length === 0)
    throw new Error('ModelRef provider cannot be empty');
  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  if (identifier.length === 0)
    throw new Error('ModelRef identifier cannot be empty');

  return trimmed as ModelRef;
};
