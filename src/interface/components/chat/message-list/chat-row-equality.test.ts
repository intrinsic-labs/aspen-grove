import type { ULID } from '@domain/value-objects';
import type { ChatRow } from '../types';
import { sameChatRow } from './chat-row-equality';

const row = (overrides: Partial<ChatRow> = {}): ChatRow => ({
  id: '01HZZZZZZZZZZZZZZZZZZZZZZZ' as ULID,
  localId: 'ABC123',
  authorType: 'model',
  text: 'Hello',
  bookmarked: false,
  pruned: false,
  continuationCount: 1,
  ...overrides,
});

describe('sameChatRow', () => {
  it('treats a rebuilt row with the same fields as the same', () => {
    expect(sameChatRow(row(), row())).toBe(true);
  });

  it.each<Partial<ChatRow>>([
    { text: 'Hello again' },
    { bookmarked: true },
    { pruned: true },
    { continuationCount: 3 },
    { localId: 'XYZ999' },
    { authorType: 'human' },
    { editedFrom: '01HYYYYYYYYYYYYYYYYYYYYYYY' as ULID },
    { id: '01HXXXXXXXXXXXXXXXXXXXXXXX' as ULID },
  ])('sees a change in %o', (change) => {
    expect(sameChatRow(row(), row(change))).toBe(false);
  });
});
