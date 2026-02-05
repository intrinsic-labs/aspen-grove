declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

/**
 * ContentHash type used in provenance calculations
 *
 * See docs/architecture/model/provenance.md
 */
export type ContentHash = Brand<string, 'ContentHash'>;

/**
 * Parses a string as a ContentHash.
 * Use when loading from database.
 */
export const parseContentHash = (value: string): ContentHash => {
  const SHA256_REGEX = /^[a-f0-9]{64}$/i;
  const isValidSha256 = SHA256_REGEX.test(value);
  if (!isValidSha256)
    throw new Error('Input format does not match valid SHA-256 hash format');
  return value as ContentHash;
};
