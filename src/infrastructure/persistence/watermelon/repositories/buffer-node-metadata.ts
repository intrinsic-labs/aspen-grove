import type { BufferNodeInfo, NodeMetadata } from '@domain/entities';
import { parseULID, type ULID } from '@domain/value-objects';
import { isPlainObject } from './helpers';

const isId = (value: unknown): value is ULID => {
  if (typeof value !== 'string') return false;
  try {
    parseULID(value);
    return true;
  } catch {
    return false;
  }
};

const isBufferInfo = (value: unknown): value is BufferNodeInfo => {
  if (!isPlainObject(value)) return false;
  const { creationParentId, drawId, slot, interruption } = value;
  return (
    (creationParentId === undefined || isId(creationParentId)) &&
    (drawId === undefined || isId(drawId)) &&
    (slot === undefined ||
      (typeof slot === 'number' && Number.isSafeInteger(slot) && slot >= 0)) &&
    (interruption === undefined ||
      interruption === 'timeout' ||
      interruption === 'network' ||
      interruption === 'provider_error' ||
      interruption === 'cancelled')
  );
};

/** Watermelon's @json accessor already decoded the column. Retain its keys and order. */
export function parseBufferNodeMetadata(
  value: unknown
): Record<string, unknown> & { buffer?: BufferNodeInfo } {
  if (!isPlainObject(value)) return {};
  if (value.buffer === undefined || isBufferInfo(value.buffer))
    return { ...value };
  const rest = { ...value };
  delete rest.buffer;
  return rest;
}

/** Overlay just the fields being written. Future namespace keys survive flag updates. */
export function serializeNodeMetadata(
  raw: unknown,
  changes: Partial<NodeMetadata> = {}
): Record<string, unknown> {
  const metadata = parseBufferNodeMetadata(raw);
  return { ...metadata, ...changes };
}
