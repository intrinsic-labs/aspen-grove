import { describe, expect, it, jest } from '@jest/globals';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, Text, type TextStyle, View } from 'react-native';
import { AstRenderer, renderRules } from 'react-native-markdown-display';
import { parseMarkdownUncached } from './markdown-parse';
import { markdownRules } from './markdown-rules';
import { createMarkdownStyles } from './markdown-styles';

// The highlighter ships untranspiled ESM; code blocks aren't under test here.
jest.mock('./CodeBlock', () => ({ CodeBlock: () => null }));

type Element = ReactElement<{ children?: ReactNode; style?: unknown }>;

const colors = {
  textColor: 'white',
  secondary: 'grey',
  codeBackground: 'black',
  green: 'green',
};

/** The element tree a message's markdown renders to, with our rules. */
const render = (source: string): Element => {
  const renderer = new AstRenderer(
    { ...renderRules, ...markdownRules },
    createMarkdownStyles(undefined, colors)
  );
  return renderer.render(
    parseMarkdownUncached(source) as never
  ) as unknown as Element;
};

const childrenOf = (element: Element): Element[] =>
  ([] as ReactNode[])
    .concat(element.props.children ?? [])
    .flat(Infinity as 1)
    .filter(isValidElement) as Element[];

const walk = (element: Element, visit: (element: Element) => void) => {
  visit(element);
  childrenOf(element).forEach((child) => walk(child, visit));
};

/** Every element of a type, outermost first. */
const all = (root: Element, type: unknown): Element[] => {
  const found: Element[] = [];
  walk(root, (element) => {
    if (element.type === type) {
      found.push(element);
    }
  });
  return found;
};

/** A Text's whole string, nested spans included. */
const textOf = (element: Element): string =>
  ([] as ReactNode[])
    .concat(element.props.children ?? [])
    .flat(Infinity as 1)
    .map((child) =>
      isValidElement(child)
        ? textOf(child as Element)
        : typeof child === 'string'
          ? child
          : ''
    )
    .join('');

/** The outermost Texts: one per block of running text. */
const textBlocks = (root: Element): Element[] => {
  const blocks: Element[] = [];
  const visit = (element: Element) => {
    if (element.type === Text) {
      blocks.push(element);
      return;
    }
    childrenOf(element).forEach(visit);
  };
  visit(root);
  return blocks;
};

const fontOf = (element: Element): unknown =>
  StyleSheet.flatten(element.props.style as TextStyle | undefined)?.fontFamily;

/** Views holding more than one Text side by side (each wraps on its own). */
const viewsWithSiblingTexts = (root: Element): Element[] =>
  all(root, View).filter(
    (view) => childrenOf(view).filter((child) => child.type === Text).length > 1
  );

const SENTENCE =
  'The clonal **root system** can survive `fire`, drought and *centuries*, so one grove is one organism.';

describe('inline markdown in a block', () => {
  it('sets a paragraph as one Text with its bold, code and italic nested', () => {
    const tree = render(SENTENCE);

    expect(viewsWithSiblingTexts(tree)).toEqual([]);
    const [paragraph] = textBlocks(tree);
    expect(textBlocks(tree)).toHaveLength(1);
    expect(textOf(paragraph)).toBe(
      'The clonal root system can survive fire, drought and centuries, so one grove is one organism.'
    );
    const fonts = all(paragraph, Text).map(fontOf);
    expect(fonts).toEqual(
      expect.arrayContaining([
        'Cardo-Bold',
        'Cardo-Italic',
        'IBMPlexMono-Regular',
      ])
    );
  });

  it('keeps a list item’s bold lead-in on the line with its text', () => {
    const tree = render(
      '- **Connected roots:** every stem draws on one network.\n- Plain item'
    );

    expect(viewsWithSiblingTexts(tree)).toEqual([]);
    const texts = textBlocks(tree).map(textOf);
    expect(texts).toContain(
      'Connected roots: every stem draws on one network.'
    );
  });

  it('keeps inline code in a table cell inside the cell’s one Text', () => {
    const tree = render(
      '| Call | Returns |\n| --- | --- |\n| `loom.branch(3)` | `void`, not the *original* |'
    );

    expect(viewsWithSiblingTexts(tree)).toEqual([]);
    expect(textBlocks(tree).map(textOf)).toContain('void, not the original');
  });

  it('keeps a heading’s emphasis in the heading’s Text', () => {
    const tree = render('## A *quaking* aspen');

    expect(viewsWithSiblingTexts(tree)).toEqual([]);
    expect(textBlocks(tree).map(textOf)).toEqual(['A quaking aspen']);
  });
});
