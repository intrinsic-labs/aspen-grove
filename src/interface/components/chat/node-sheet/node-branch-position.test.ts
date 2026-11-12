import { describe, expect, it } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import { toNodeBranchPosition } from './node-branch-position';

const path = ['a', 'b', 'c'] as ULID[];

describe('toNodeBranchPosition', () => {
  it('counts a path node and those after it', () => {
    expect(toNodeBranchPosition('b' as ULID, path)).toEqual({
      count: 2,
      onActivePath: true,
      isCurrent: false,
    });
  });

  it('knows the current node', () => {
    expect(toNodeBranchPosition('c' as ULID, path).isCurrent).toBe(true);
  });

  it('counts a node off the path as 1', () => {
    expect(toNodeBranchPosition('x' as ULID, path)).toEqual({
      count: 1,
      onActivePath: false,
      isCurrent: false,
    });
  });
});
