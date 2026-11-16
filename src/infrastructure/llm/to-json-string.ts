/**
 * A thrown or returned value as text for an error message. An `Error` reads
 * as `Name: message` (JSON.stringify would give `{}`, dropping both); other
 * values as JSON, or `String(value)` when they can't be serialized.
 */
export const toJsonString = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message ? `${value.name}: ${value.message}` : value.name;
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};
