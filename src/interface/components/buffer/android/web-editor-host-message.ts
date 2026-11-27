import type {
  HostMessage,
  ModelRange,
  WebEditorStyle,
} from './web-editor-protocol';

const isInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value);

const isNonNegativeInteger = (value: unknown): value is number =>
  isInteger(value) && value >= 0;

const isRange = (value: unknown): value is ModelRange =>
  Array.isArray(value) &&
  value.length === 2 &&
  isNonNegativeInteger(value[0]) &&
  isNonNegativeInteger(value[1]) &&
  value[1] >= value[0];

const isRanges = (value: unknown): value is readonly ModelRange[] =>
  Array.isArray(value) && value.every(isRange);

const isEnds = (value: unknown): value is readonly number[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (end, index) =>
      isNonNegativeInteger(end) &&
      (index === 0 || end >= (value[index - 1] as number))
  );

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const isWebEditorStyle = (
  value: unknown
): value is WebEditorStyle => {
  const style = value as Partial<WebEditorStyle> | null;
  return (
    typeof style === 'object' &&
    style !== null &&
    typeof style.fontFamily === 'string' &&
    isFiniteNonNegative(style.fontSize) &&
    isFiniteNonNegative(style.lineHeight) &&
    isFiniteNonNegative(style.paddingTop) &&
    isFiniteNonNegative(style.paddingHorizontal) &&
    isFiniteNonNegative(style.paddingBottom) &&
    typeof style.humanColor === 'string' &&
    typeof style.modelColor === 'string' &&
    typeof style.placeholderColor === 'string' &&
    typeof style.backgroundColor === 'string' &&
    typeof style.placeholder === 'string' &&
    typeof style.diagnostics === 'boolean'
  );
};

/** The host's message, or null for anything malformed (never trusted). */
export const parseHostMessage = (raw: string): HostMessage | null => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const message = value as Record<string, unknown> | null;
  if (typeof message !== 'object' || message === null) return null;

  if (message.type === 'style' && isWebEditorStyle(message.style)) {
    return message as unknown as HostMessage;
  }
  if (
    message.type === 'load' &&
    isInteger(message.epoch) &&
    typeof message.text === 'string' &&
    (message.caret === undefined || isInteger(message.caret)) &&
    typeof message.readOnly === 'boolean' &&
    isRanges(message.modelRanges) &&
    isEnds(message.ends) &&
    isWebEditorStyle(message.style)
  ) {
    return message as unknown as HostMessage;
  }
  if (
    message.type === 'readOnly' &&
    isInteger(message.epoch) &&
    typeof message.readOnly === 'boolean'
  ) {
    return message as unknown as HostMessage;
  }
  if (
    message.type === 'settle' &&
    isInteger(message.epoch) &&
    isInteger(message.requestId)
  ) {
    return message as unknown as HostMessage;
  }
  if (
    message.type === 'ack' &&
    isInteger(message.epoch) &&
    isNonNegativeInteger(message.revision)
  ) {
    return message as unknown as HostMessage;
  }
  if (
    (message.type === 'checkpointRequest' ||
      message.type === 'endComposition') &&
    isInteger(message.epoch)
  ) {
    return message as unknown as HostMessage;
  }
  return null;
};
