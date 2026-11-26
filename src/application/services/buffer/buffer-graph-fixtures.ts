import type {
  Content,
  Edge,
  EdgeType,
  Node,
  SourceRole,
} from '@domain/entities';
import type { ContentHash, LocalId, ULID } from '@domain/value-objects';

/** Test data for the buffer graph suites; nothing here ships. */
export const id = (name: string): ULID => name as ULID;

export const textNode = (
  name: string,
  text: string,
  options: {
    readonly at?: number;
    readonly editedFrom?: string;
    readonly excluded?: boolean;
    readonly pruned?: boolean;
    readonly content?: Content;
    readonly tree?: string;
  } = {}
): Node => ({
  id: id(name),
  localId: name as LocalId,
  loomTreeId: id(options.tree ?? 'tree'),
  content: options.content ?? { type: 'text', text },
  authorAgentId: id('agent'),
  authorType: 'human',
  contentHash: 'hash' as ContentHash,
  createdAt: new Date(options.at ?? 0),
  metadata: {
    bookmarked: false,
    pruned: options.pruned ?? false,
    excluded: options.excluded ?? false,
  },
  editedFrom: options.editedFrom ? id(options.editedFrom) : undefined,
});

export const link = (
  name: string,
  sources: readonly string[],
  target: string,
  at = 0,
  options: {
    readonly type?: EdgeType;
    readonly role?: SourceRole;
    readonly tree?: string;
  } = {}
): Edge => ({
  id: id(name),
  loomTreeId: id(options.tree ?? 'tree'),
  sources: sources.map((source) => ({
    nodeId: id(source),
    role: options.role ?? 'primary',
  })),
  targetNodeId: id(target),
  edgeType: options.type ?? 'continuation',
  createdAt: new Date(at),
});

/** What an edit does to existing edges: add the new version as a source. */
export const withSource = (
  edges: readonly Edge[],
  edgeId: string,
  nodeId: string
): Edge[] =>
  edges.map((edge) =>
    edge.id === edgeId
      ? {
          ...edge,
          sources: [...edge.sources, { nodeId: id(nodeId), role: 'primary' }],
        }
      : edge
  );

const pad = (n: number): string => `n${String(n).padStart(2, '0')}`;

/** n00 -> n01 -> ... -> n(count-1), each a single-source continuation. */
export const spine = (count: number): { nodes: Node[]; edges: Edge[] } => ({
  nodes: Array.from({ length: count }, (_, i) =>
    textNode(pad(i), `<${i}>`, { at: i })
  ),
  edges: Array.from({ length: count - 1 }, (_, i) =>
    link(`e${i}`, [pad(i)], pad(i + 1), i + 1)
  ),
});

export const spineId = (n: number): ULID => id(pad(n));
