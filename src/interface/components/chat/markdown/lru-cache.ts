/**
 * A small least-recently-used cache: reading an entry makes it the newest,
 * and adding past `capacity` drops the oldest.
 */
export class LruCache<K, V> {
  private readonly entries = new Map<K, V>();

  constructor(private readonly capacity: number) {
    if (capacity < 1) {
      throw new Error('LruCache capacity must be at least 1');
    }
  }

  get size(): number {
    return this.entries.size;
  }

  get(key: K): V | undefined {
    if (!this.entries.has(key)) {
      return undefined;
    }
    const value = this.entries.get(key) as V;
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) {
        this.entries.delete(oldest.value);
      }
    }
  }

  /** The cached value for `key`, computing and storing it on a miss. */
  getOrCreate(key: K, create: () => V): V {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const created = create();
    this.set(key, created);
    return created;
  }
}
