export const isRecordNotFoundError = (
  error: unknown,
  table: string
): boolean => {
  if (!(error instanceof Error) || typeof error.message !== 'string') {
    return false;
  }

  const prefix = `Record ${table}#`;
  return error.message.startsWith(prefix) && error.message.endsWith(' not found');
};

export const toOptionalDate = (
  value: Date | null | undefined
): Date | undefined => {
  return value ?? undefined;
};

export const toOptionalString = (
  value: string | null | undefined
): string | undefined => {
  return value ?? undefined;
};

export const isPlainObject = (
  value: unknown
): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
