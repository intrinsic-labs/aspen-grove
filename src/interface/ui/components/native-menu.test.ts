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
    const at = (indexPath: number[]) => ({
      index: indexPath[indexPath.length - 1] ?? 0,
      indexPath,
    });
    expect(findNativeMenuItem(sections, at([0, 1]))?.action).toBe('b');
    expect(findNativeMenuItem(sections, at([1, 0]))?.action).toBe('c');
    expect(findNativeMenuItem(sections, at([2, 0]))).toBeUndefined();
    expect(findNativeMenuItem(sections, at([0]))).toBeUndefined();
    expect(findNativeMenuItem([sections[0]], at([1]))?.action).toBe('b');
  });

  it('reads a press that comes with index alone as a top-level item', () => {
    expect(findNativeMenuItem([sections[0]], { index: 1 })?.action).toBe('b');
    expect(findNativeMenuItem(sections, { index: 1 })).toBeUndefined();
  });
});
