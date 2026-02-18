/**
 * ULID Value Object
 *
 * Branded type for ULIDs — provides compile-time safety to prevent
 * accidentally passing arbitrary strings where ULIDs are expected.
 *
 * ULIDs are 26-character, sortable, unique identifiers.
 * See: https://github.com/ulid/spec
 */

import { isValid, monotonicFactory } from 'ulidx';

// =========================
// Brand Definition
// =========================

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

/** Branded ULID type - a string at runtime but distinct at compile time */
export type ULID = Brand<string, 'ULID'>;

// ========================
// Factory Function
// ========================

const nextULID = monotonicFactory();

/**
 * Creates a new ULID.
 */
export const createULID = (): ULID => nextULID() as ULID;

/**
 * Parses an existing string as a ULID.
 */
export const parseULID = (value: string): ULID => {
  if (!isValid(value)) {
    throw new Error(`Invalid ULID: ${value}`);
  }
  return value as ULID;
};
