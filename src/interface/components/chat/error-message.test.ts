import { describe, expect, it } from '@jest/globals';
import { toErrorMessage } from './error-message';

describe('toErrorMessage', () => {
  it('uses an Error message', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('stringifies anything else', () => {
    expect(toErrorMessage('plain')).toBe('plain');
    expect(toErrorMessage(42)).toBe('42');
  });
});
