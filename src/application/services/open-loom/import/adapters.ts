/**
 * Import adapters: normalize foreign loom formats into the OpenLoom v2
 * in-memory model (spec §8). Aspen Grove imports from anything, exports
 * only OpenLoom — every adapter's output feeds the same persister.
 *
 * Adapter rules (spec §8.5): never invent provenance, omit unparseable
 * timestamps, park unmapped-but-parsed data under a source-named extension.
 */

import {
  OPEN_LOOM_FORMAT,
  OPEN_LOOM_VERSION,
  type OpenLoomDocument,
  type OpenLoomEdge,
  type OpenLoomNode,
  type OpenLoomTree,
} from '../format';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const isoOrUndefined = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Heuristic: epoch ms vs epoch seconds.
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  return undefined;
};

const wrapDocument = (tree: OpenLoomTree): OpenLoomDocument => ({
  format: OPEN_LOOM_FORMAT,
  version: OPEN_LOOM_VERSION,
  trees: [tree],
});

// =============================
// OpenLoom v2 (validation-only pass-through)
// =============================

export const adaptOpenLoomV2 = (document: unknown): OpenLoomDocument => {
  if (!isRecord(document) || document.format !== 'open-loom') {
    throw new Error('Not an OpenLoom document.');
  }
  const version = asString(document.version) ?? '2.0';
  const major = version.split('.')[0];
  if (major !== '2') {
    throw new Error(
      `Unsupported OpenLoom version ${version} (this app reads 2.x).`
    );
  }
  if (!Array.isArray(document.trees) || document.trees.length === 0) {
    throw new Error('OpenLoom document contains no trees.');
  }
  for (const tree of document.trees) {
    if (!isRecord(tree) || !isRecord(tree.nodes)) {
      throw new Error('OpenLoom tree is missing its node map.');
    }
    if (!Array.isArray(tree.rootNodeIds) || tree.rootNodeIds.length === 0) {
      throw new Error('OpenLoom tree is missing rootNodeIds.');
    }
  }
  return document as unknown as OpenLoomDocument;
};

// =============================
// OpenLoom v1 (Loom Swift prototype)
// =============================

/** Swift's default Date encoding: seconds since 2001-01-01T00:00:00Z. */
const SWIFT_REFERENCE_EPOCH_MS = 978307200000;

const swiftDate = (value: unknown): string | undefined =>
  typeof value === 'number' && Number.isFinite(value)
    ? new Date(SWIFT_REFERENCE_EPOCH_MS + value * 1000).toISOString()
    : isoOrUndefined(value);

export const adaptOpenLoomV1 = (document: unknown): OpenLoomDocument => {
  if (!isRecord(document) || !isRecord(document.nodes)) {
    throw new Error('Not an OpenLoom v1 file.');
  }

  const nodes: Record<string, OpenLoomNode> = {};
  const edges: OpenLoomEdge[] = [];
  const childOrder = new Map<string, string[]>();

  for (const [id, rawNode] of Object.entries(document.nodes)) {
    if (!isRecord(rawNode)) {
      continue;
    }
    const author = asString(rawNode.author);
    const role =
      author === 'assistant'
        ? 'model'
        : author === 'system'
          ? 'system'
          : 'human';
    const modelId = asString(rawNode.modelId);
    nodes[id] = {
      id,
      content: [{ type: 'text', text: asString(rawNode.text) ?? '' }],
      author: { role },
      createdAt: swiftDate(rawNode.createdTime),
      meta: {
        bookmarked: rawNode.isBookmarked === true || undefined,
        bookmarkLabel: asString(rawNode.bookmarkTitle),
      },
      generation: role === 'model' && modelId ? { model: modelId } : undefined,
    };
    if (Array.isArray(rawNode.childrenIds)) {
      childOrder.set(
        id,
        rawNode.childrenIds.filter(
          (child): child is string => typeof child === 'string'
        )
      );
    }
  }

  // childrenIds carries sibling order; parentId alone does not.
  for (const [parentId, childIds] of childOrder) {
    for (const childId of childIds) {
      if (nodes[childId]) {
        edges.push({
          type: 'continuation',
          sources: [{ nodeId: parentId, role: 'primary' }],
          targetNodeId: childId,
        });
      }
    }
  }

  const rootNodeId = asString(document.rootNodeId);
  if (!rootNodeId || !nodes[rootNodeId]) {
    throw new Error('OpenLoom v1 file has no resolvable root node.');
  }

  return wrapDocument({
    id: asString(document.id) ?? rootNodeId,
    title: asString(document.title) ?? 'Imported Loom',
    description: asString(document.description),
    mode: 'dialogue',
    systemContext: asString(document.systemMessage) || undefined,
    rootNodeIds: [rootNodeId],
    currentNodeId: asString(document.currentNodeId),
    updatedAt: swiftDate(document.lastModified),
    nodes,
    edges,
  });
};

// =============================
// socketteer/loom (original Python loom)
// =============================

export const adaptSocketteerLoom = (document: unknown): OpenLoomDocument => {
  const rootCandidates: Record<string, unknown>[] = [];
  let container: Record<string, unknown> = {};

  if (Array.isArray(document)) {
    rootCandidates.push(...document.filter(isRecord));
  } else if (isRecord(document) && isRecord(document.root)) {
    container = document;
    rootCandidates.push(document.root);
  } else if (isRecord(document)) {
    rootCandidates.push(document);
  }
  if (rootCandidates.length === 0) {
    throw new Error('Not a socketteer loom file.');
  }

  const modelResponses = isRecord(container.model_responses)
    ? container.model_responses
    : {};

  const nodes: Record<string, OpenLoomNode> = {};
  const edges: OpenLoomEdge[] = [];
  const rootNodeIds: string[] = [];
  let fallbackIdCounter = 0;

  const visit = (rawNode: Record<string, unknown>, parentId?: string): void => {
    const id = asString(rawNode.id) ?? `imported-${fallbackIdCounter++}`;
    const meta = isRecord(rawNode.meta) ? rawNode.meta : {};
    const source = asString(meta.source);
    const role =
      source === 'AI' ? 'model' : source === 'mixed' ? 'mixed' : 'human';
    const tags = Array.isArray(rawNode.tags)
      ? rawNode.tags.filter((tag): tag is string => typeof tag === 'string')
      : [];

    const generationRef = isRecord(rawNode.generation)
      ? rawNode.generation
      : undefined;
    const responseId = generationRef ? asString(generationRef.id) : undefined;
    const response =
      responseId && isRecord(modelResponses[responseId])
        ? (modelResponses[responseId] as Record<string, unknown>)
        : undefined;

    nodes[id] = {
      id,
      content: [{ type: 'text', text: asString(rawNode.text) ?? '' }],
      author: { role: role === 'mixed' ? 'mixed' : role },
      createdAt: isoOrUndefined(meta.creation_timestamp),
      meta: {
        bookmarked: tags.includes('bookmark') || undefined,
        tags: tags.filter((tag) => tag !== 'bookmark'),
      },
      generation:
        role !== 'human' && (response || generationRef)
          ? {
              model: response ? asString(response.model) : undefined,
              completionIndex:
                generationRef && typeof generationRef.index === 'number'
                  ? generationRef.index
                  : undefined,
            }
          : undefined,
      extensions: {
        'socketteer-loom': {
          originalId: asString(rawNode.id),
          chapterId: asString(rawNode.chapter_id),
        },
      },
    };

    if (parentId) {
      edges.push({
        type: 'continuation',
        sources: [{ nodeId: parentId, role: 'primary' }],
        targetNodeId: id,
      });
    } else {
      rootNodeIds.push(id);
    }

    if (Array.isArray(rawNode.children)) {
      for (const child of rawNode.children) {
        if (isRecord(child)) {
          visit(child, id);
        }
      }
    }
  };

  for (const root of rootCandidates) {
    visit(root);
  }

  return wrapDocument({
    id: rootNodeIds[0],
    title: 'Imported Loom (socketteer)',
    mode: 'dialogue',
    rootNodeIds,
    currentNodeId: asString(container.selected_node_id),
    nodes,
    edges,
  });
};

// =============================
// Loomsidian (cosmicoptima/loom for Obsidian)
// =============================

type LoomsidianState = {
  readonly current?: string;
  readonly nodes: Record<string, Record<string, unknown>>;
  readonly title: string;
};

const extractLoomsidianStates = (document: unknown): LoomsidianState[] => {
  const toState = (value: unknown, title: string): LoomsidianState | null => {
    if (!isRecord(value) || !isRecord(value.nodes)) {
      return null;
    }
    const nodes: Record<string, Record<string, unknown>> = {};
    for (const [id, node] of Object.entries(value.nodes)) {
      if (isRecord(node) && typeof node.text === 'string') {
        nodes[id] = node;
      }
    }
    if (Object.keys(nodes).length === 0) {
      return null;
    }
    return { current: asString(value.current), nodes, title };
  };

  if (isRecord(document) && isRecord(document.state)) {
    return Object.entries(document.state)
      .map(([notePath, state]) => toState(state, notePath))
      .filter((state): state is LoomsidianState => state !== null);
  }
  const single = toState(document, 'Imported Loom (Loomsidian)');
  return single ? [single] : [];
};

export const adaptLoomsidian = (document: unknown): OpenLoomDocument => {
  const states = extractLoomsidianStates(document);
  if (states.length === 0) {
    throw new Error('Not a Loomsidian file.');
  }

  const trees = states.map((state): OpenLoomTree => {
    const nodes: Record<string, OpenLoomNode> = {};
    const edges: OpenLoomEdge[] = [];
    const rootNodeIds: string[] = [];

    for (const [id, rawNode] of Object.entries(state.nodes)) {
      const parentId = asString(rawNode.parentId);
      nodes[id] = {
        id,
        content: [{ type: 'text', text: asString(rawNode.text) ?? '' }],
        // Loomsidian stores no authorship. The root is the human-written
        // note prefix; descendants are usually model text but frequently
        // human-edited, so `mixed` is the honest default (spec §8.3).
        author: { role: parentId ? 'mixed' : 'human' },
        meta: { bookmarked: rawNode.bookmarked === true || undefined },
        extensions: {
          loomsidian: {
            unread: rawNode.unread === true,
            collapsed: rawNode.collapsed === true,
            lastVisited: rawNode.lastVisited,
          },
        },
      };
      if (parentId && state.nodes[parentId]) {
        edges.push({
          type: 'continuation',
          sources: [{ nodeId: parentId, role: 'primary' }],
          targetNodeId: id,
        });
      } else {
        rootNodeIds.push(id);
      }
    }

    return {
      id: rootNodeIds[0] ?? state.title,
      title: state.title,
      mode: 'buffer',
      rootNodeIds,
      currentNodeId: state.current,
      nodes,
      edges,
    };
  });

  return { format: OPEN_LOOM_FORMAT, version: OPEN_LOOM_VERSION, trees };
};
