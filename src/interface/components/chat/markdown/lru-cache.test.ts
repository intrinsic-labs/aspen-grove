import { LruCache } from './lru-cache';

describe('LruCache', () => {
  it('returns what was stored', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('drops the least recently used entry past capacity', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);

    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('creates a value once and reuses it', () => {
    const cache = new LruCache<string, object>(4);
    const create = jest.fn(() => ({}));

    const first = cache.getOrCreate('k', create);
    const second = cache.getOrCreate('k', create);

    expect(second).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('rejects a capacity below one', () => {
    expect(() => new LruCache(0)).toThrow();
  });
});
