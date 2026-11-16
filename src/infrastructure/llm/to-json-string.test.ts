import { describe, expect, it } from '@jest/globals';
import { toJsonString } from './to-json-string';

describe('toJsonString', () => {
  it('names an Error and keeps its message, rather than "{}"', () => {
    expect(toJsonString(new TypeError('Network request failed'))).toBe(
      'TypeError: Network request failed'
    );
    expect(toJsonString(new Error(''))).toBe('Error');
  });

  it('serializes plain values as JSON', () => {
    expect(toJsonString({ error: 'bad model' })).toBe('{"error":"bad model"}');
    expect(toJsonString('text')).toBe('"text"');
  });

  it('falls back to String for what JSON cannot hold', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(toJsonString(cyclic)).toBe('[object Object]');
    expect(toJsonString(undefined)).toBe('undefined');
  });
});
