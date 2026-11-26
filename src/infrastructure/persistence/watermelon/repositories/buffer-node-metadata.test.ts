import {
  parseBufferNodeMetadata,
  serializeNodeMetadata,
} from './buffer-node-metadata';

test('legacy metadata round-trips', () => {
  for (const bytes of [
    '{}',
    '{"labelV2":null,"pruned":false,"extra":{"z":1},"bookmarked":true}',
  ]) {
    expect(
      JSON.stringify(
        serializeNodeMetadata(parseBufferNodeMetadata(JSON.parse(bytes)))
      )
    ).toBe(bytes);
  }
});

test('flag and label updates preserve creation evidence and unknown keys', () => {
  const raw = {
    extra: 7,
    buffer: {
      creationParentId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      drawId: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
      slot: 0,
      interruption: 'network',
      future: [1],
    },
  };
  expect(parseBufferNodeMetadata(raw)).toEqual(raw);
  const changes = { bookmarked: true, bookmarkLabel: 'review', pruned: true };
  expect(serializeNodeMetadata(raw, changes)).toEqual({ ...raw, ...changes });
});

test.each([
  null,
  [],
  'bad',
  { slot: -1 },
  { slot: 0.5 },
  { creationParentId: 'bad' },
  { drawId: 0 },
  { interruption: 'unknown' },
])('drops a malformed buffer namespace (%j)', (buffer) => {
  expect(serializeNodeMetadata({ buffer, other: 'kept' })).toEqual({
    other: 'kept',
  });
});
