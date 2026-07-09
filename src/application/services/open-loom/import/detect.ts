export type LoomImportFormat =
  | 'open-loom-v2'
  | 'open-loom-v1'
  | 'socketteer-loom'
  | 'loomsidian'
  | 'miniloom';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const looksLikeSocketteerNode = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.text === 'string' &&
  (value.children === undefined || Array.isArray(value.children));

const looksLikeLoomsidianState = (value: unknown): boolean => {
  if (!isRecord(value) || !isRecord(value.nodes)) {
    return false;
  }
  const nodes = Object.values(value.nodes);
  return (
    typeof value.current === 'string' &&
    nodes.length > 0 &&
    nodes.every(
      (node) =>
        isRecord(node) && typeof node.text === 'string' && 'parentId' in node
    )
  );
};

/**
 * Sniffs which loom format a parsed JSON document is in.
 *
 * Detection follows spec §8: explicit `format` field wins; legacy formats
 * are recognized by shape. Returns null when nothing matches — callers
 * surface "unrecognized format" to the user.
 */
export const detectLoomFormat = (
  document: unknown
): LoomImportFormat | null => {
  // Bare socketteer node or node array (its loader's leniency, mirrored).
  if (Array.isArray(document)) {
    return document.length > 0 && document.every(looksLikeSocketteerNode)
      ? 'socketteer-loom'
      : null;
  }
  if (!isRecord(document)) {
    return null;
  }

  if (document.format === 'open-loom') {
    return 'open-loom-v2';
  }

  // Open Loom v1 (Loom Swift prototype): flat node map + duplicated
  // bookmarkedNodes dict, no version field.
  if (
    isRecord(document.nodes) &&
    'bookmarkedNodes' in document &&
    typeof document.rootNodeId === 'string'
  ) {
    return 'open-loom-v1';
  }

  // MiniLoom: flat nodeStore of diff-patched nodes.
  if (
    isRecord(document.loomTree) &&
    isRecord((document.loomTree as Record<string, unknown>).nodeStore)
  ) {
    return 'miniloom';
  }

  // socketteer/loom: nested root node (full save file or bare node).
  if (
    looksLikeSocketteerNode(document.root) ||
    looksLikeSocketteerNode(document)
  ) {
    return 'socketteer-loom';
  }

  // Loomsidian: a NoteState, or the plugin's data.json ({settings, state}).
  if (looksLikeLoomsidianState(document)) {
    return 'loomsidian';
  }
  if (
    isRecord(document.state) &&
    Object.values(document.state).some(looksLikeLoomsidianState)
  ) {
    return 'loomsidian';
  }

  return null;
};
