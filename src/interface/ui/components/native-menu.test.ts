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

  it('draws one flat list on Android, which has no inline sections', () => {
    expect(
      toNativeMenuActions(sections, 'android').map((action) => action.title)
    ).toEqual(['A', 'B', 'C']);
  });

  it('finds an Android press, which comes with index alone at the top level', () => {
    expect(findNativeMenuItem(sections, { index: 2 }, 'android')?.action).toBe(
      'c'
    );
    expect(findNativeMenuItem([sections[0]], { index: 1 }, 'ios')?.action).toBe(
      'b'
    );
  });
});
