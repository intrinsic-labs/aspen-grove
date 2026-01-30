import { ulid, decodeTime } from 'ulid';

/**
 * ULID Utilities
 *
 * Aspen Grove uses ULIDs (Universally Unique Lexicographically Sortable Identifiers)
 * for all entity IDs. ULIDs provide:
 * - 128-bit compatibility with UUID
 * - Lexicographically sortable (contains timestamp)
 * - Case insensitive
 * - No special characters (URL safe)
 * - Monotonically increasing within same millisecond
 */

/**
 * Generate a new ULID
 *
 * ULIDs are 26 characters, containing a 48-bit timestamp (10 chars)
 * and 80 bits of randomness (16 chars).
 *
 * @returns A new ULID string
 */
export function generateUlid(): string {
  return ulid();
}

/**
 * Extract the timestamp from a ULID
 *
 * @param id - A valid ULID string
 * @returns The timestamp in milliseconds since Unix epoch
 */
export function getUlidTimestamp(id: string): number {
  return decodeTime(id);
}

/**
 * Extract the timestamp as a Date from a ULID
 *
 * @param id - A valid ULID string
 * @returns A Date object representing when the ULID was created
 */
export function getUlidDate(id: string): Date {
  return new Date(decodeTime(id));
}

/**
 * Check if a string is a valid ULID
 *
 * ULIDs are exactly 26 characters, using Crockford's Base32 alphabet:
 * 0123456789ABCDEFGHJKMNPQRSTVWXYZ (no I, L, O, U to avoid confusion)
 *
 * @param id - String to validate
 * @returns true if the string is a valid ULID
 */
export function isValidUlid(id: string): boolean {
  if (typeof id !== 'string' || id.length !== 26) {
    return false;
  }

  // Crockford's Base32 alphabet (uppercase)
  const validChars = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i;
  return validChars.test(id);
}

/**
 * Compare two ULIDs for sorting
 *
 * Since ULIDs are lexicographically sortable, we can use string comparison.
 * This is useful for sorting by creation time.
 *
 * @param a - First ULID
 * @param b - Second ULID
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareUlids(a: string, b: string): number {
  return a.localeCompare(b);
}

// ============================================
// Local ID Generation
// ============================================

/**
 * Generate a localId from a ULID
 *
 * LocalIds are short, tree-unique identifiers for efficient in-context reference
 * when working with loom-aware models. Full ULIDs are 26 characters, which wastes
 * context space and is error-prone for models to work with.
 *
 * Algorithm:
 * 1. Take the first 6 characters of the Node's ULID
 * 2. Check for collision within the same LoomTree
 * 3. If collision exists, extend by 1 character and repeat
 * 4. Maximum length: 8 characters
 *
 * @param fullUlid - The full ULID to derive localId from
 * @param existingLocalIds - Set of existing localIds in the tree for collision detection
 * @returns A 6-8 character localId
 */
export function generateLocalId(fullUlid: string, existingLocalIds: Set<string>): string {
  const minLength = 6;
  const maxLength = 8;

  for (let length = minLength; length <= maxLength; length++) {
    const candidate = fullUlid.slice(0, length).toLowerCase();

    if (!existingLocalIds.has(candidate)) {
      return candidate;
    }
  }

  // Extremely unlikely to reach here within a single tree
  // If we do, append a random suffix
  const baseId = fullUlid.slice(0, maxLength).toLowerCase();
  const suffix = Math.random().toString(36).slice(2, 4);
  console.warn(`[LocalId] Collision at max length, using suffix: ${baseId}${suffix}`);
  return `${baseId}${suffix}`;
}

/**
 * Check if a string could be a valid localId
 *
 * LocalIds are 6-8 characters, lowercase, using the same alphabet as ULIDs.
 *
 * @param id - String to validate
 * @returns true if the string could be a valid localId
 */
export function isValidLocalId(id: string): boolean {
  if (typeof id !== 'string' || id.length < 6 || id.length > 10) {
    return false;
  }

  // Lowercase Crockford's Base32 (potentially with random suffix)
  const validChars = /^[0123456789abcdefghjkmnpqrstvwxyz]+$/;
  return validChars.test(id);
}
