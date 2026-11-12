import { describe, expect, it } from '@jest/globals';
import {
  findNativeMenuItem,
  toNativeMenuActions,
  type NativeMenuSections,
} from './native-menu';

const sections: NativeMenuSections<'a' | 'b' | 'c'> = [
  [
    { action: 'a', title: 'A', systemIcon: 'repeat' },
    { action: 'b', title: 'B', disabled: true },
  ],
  [],
  [{ action: 'c', title: 'C', destructive: true }],
];

describe('native menu sections', () => {
  it('draws each non-empty group as an untitled inline section', () => {
    expect(toNativeMenuActions(sections)).toEqual([
      {
        title: '',
        inlineChildren: true,
        actions: [
          { title: 'A', systemIcon: 'repeat' },
          { title: 'B', disabled: true },
        ],
      },
      {
        title: '',
        inlineChildren: true,
        actions: [{ title: 'C', destructive: true }],
      },
    ]);
  });

  it('keeps a single group flat', () => {
    expect(toNativeMenuActions([sections[2]])).toEqual([
      { title: 'C', destructive: true },
    ]);
  });

  it('finds the pressed item from the native index path', () => {
    expect(findNativeMenuItem(sections, [0, 1])?.action).toBe('b');
    expect(findNativeMenuItem(sections, [1, 0])?.action).toBe('c');
    expect(findNativeMenuItem(sections, [2, 0])).toBeUndefined();
    expect(findNativeMenuItem(sections, [0])).toBeUndefined();
    expect(findNativeMenuItem([sections[0]], [1])?.action).toBe('b');
  });
});
