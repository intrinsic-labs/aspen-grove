import { describe, expect, it } from '@jest/globals';
import { type ListTail, shouldFollowEnd } from './follow-end';

const tail = (overrides: Partial<ListTail> = {}): ListTail => ({
  lastRowId: 'n-2',
  loading: false,
  sending: false,
  ...overrides,
});

describe('shouldFollowEnd', () => {
  it('follows the first rows after a load', () => {
    expect(shouldFollowEnd(null, tail())).toBe(true);
    expect(shouldFollowEnd(tail({ loading: true }), tail())).toBe(true);
  });

  it('waits while loading', () => {
    expect(shouldFollowEnd(tail(), tail({ loading: true }))).toBe(false);
  });

  it('follows a new last row', () => {
    expect(shouldFollowEnd(tail(), tail({ lastRowId: 'n-3' }))).toBe(true);
  });

  it('follows a send starting or ending (its indicator or error notice)', () => {
    expect(shouldFollowEnd(tail(), tail({ sending: true }))).toBe(true);
    expect(shouldFollowEnd(tail({ sending: true }), tail())).toBe(true);
  });

  it('stays put when the same path is rebuilt (a parallel run settling)', () => {
    expect(shouldFollowEnd(tail(), tail())).toBe(false);
  });
});
