import { describe, expect, it } from '@jest/globals';
import type { ReactElement } from 'react';
import type { ASTNode } from 'react-native-markdown-display';
import { listItemRule, parentsForNearestList } from './list-item-rule';
import { parseMarkdownUncached } from './markdown-parse';

type Found = { readonly item: ASTNode; readonly parents: ASTNode[] };

/** Every list item in the source, with its ancestors nearest first. */
const listItems = (source: string): Found[] => {
  const found: Found[] = [];
  const walk = (node: ASTNode, parents: ASTNode[]) => {
    if (node.type === 'list_item') {
      found.push({ item: node, parents });
    }
    node.children.forEach((child) => walk(child, [node, ...parents]));
  };
  parseMarkdownUncached(source).forEach((node) => walk(node, []));
  return found;
};

/** The marker a rendered list item shows: "·" / "•" or "1.", "2.", ... */
const markerOf = ({ item, parents }: Found): string => {
  const rendered = listItemRule(item, [], parents, {}) as ReactElement<{
    children: ReactElement<{ children: unknown }>[];
  }>;
  const marker = rendered.props.children[0].props.children;
  return Array.isArray(marker) ? marker.join('') : String(marker);
};

const BULLET = /^[·•]$/;

describe('listItemRule', () => {
  it('numbers a numbered list nested under a bullet', () => {
    const items = listItems('- Outer\n  1. first\n  2. second\n- Next');
    expect(items.map(markerOf)).toEqual([
      expect.stringMatching(BULLET),
      '1.',
      '2.',
      expect.stringMatching(BULLET),
    ]);
  });

  it('bullets a bulleted list nested under a numbered one', () => {
    const items = listItems('1. Outer\n   - inner\n2. Next');
    expect(items.map(markerOf)).toEqual([
      '1.',
      expect.stringMatching(BULLET),
      '2.',
    ]);
  });

  it("keeps a nested numbered list's own start", () => {
    // (A list not starting at 1 can't interrupt a paragraph: hence the blank line.)
    const items = listItems('- Outer\n\n  3. third\n  4. fourth');
    expect(items.slice(1).map(markerOf)).toEqual(['3.', '4.']);
  });
});

describe('parentsForNearestList', () => {
  it('leaves the ancestors alone when the nearest list is a bulleted one', () => {
    const [, inner] = listItems('1. Outer\n   - inner');
    expect(parentsForNearestList(inner.parents)).toEqual(inner.parents);
  });
});
