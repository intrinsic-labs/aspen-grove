import {
  renderRules,
  type ASTNode,
  type RenderFunction,
} from 'react-native-markdown-display';

const isList = (node: ASTNode): boolean =>
  node.type === 'bullet_list' || node.type === 'ordered_list';

/**
 * A list item's ancestors as the library's `list_item` rule should see them.
 * That rule draws a bullet whenever any ancestor is a bullet list, so a
 * numbered list nested under a bullet would show bullets; it is told only
 * about the item's own (nearest) list kind. Ancestors come nearest first.
 */
export const parentsForNearestList = (
  parents: readonly ASTNode[]
): ASTNode[] => {
  const nearest = parents.find(isList);
  return nearest?.type === 'ordered_list'
    ? parents.filter((node) => node.type !== 'bullet_list')
    : [...parents];
};

/** The library's list item, marked by its own list: "1." in a numbered one. */
export const listItemRule: RenderFunction = (
  node,
  children,
  parents,
  styles,
  inheritedStyles
) =>
  renderRules.list_item?.(
    node,
    children,
    parentsForNearestList(parents),
    styles,
    inheritedStyles
  );
