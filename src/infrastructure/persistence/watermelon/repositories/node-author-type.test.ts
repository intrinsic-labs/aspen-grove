import { toNodeAuthorType } from './node-author-type';

describe('toNodeAuthorType', () => {
  it('reads rows written before the system role exactly as they were', () => {
    expect(toNodeAuthorType('human')).toBe('human');
    expect(toNodeAuthorType('model')).toBe('model');
  });

  it('reads a system row as a system node', () => {
    expect(toNodeAuthorType('system')).toBe('system');
  });

  it('reads an unknown or missing value as human', () => {
    expect(toNodeAuthorType('mixed')).toBe('human');
    expect(toNodeAuthorType('')).toBe('human');
    expect(toNodeAuthorType(null)).toBe('human');
    expect(toNodeAuthorType(undefined)).toBe('human');
  });
});
