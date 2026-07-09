import { describe, expect, it } from '@jest/globals';
import type { Agent, Edge, LoomTree, Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { buildOpenLoomDocument } from './export-open-loom';
import { renderPathMarkdown } from './export-markdown';
import { detectLoomFormat } from './import/detect';
import { parseLoomImport } from './import/parse-loom-import';

const now = new Date('2026-07-08T12:00:00.000Z');

const makeNode = (input: {
  id: string;
  text: string;
  authorType: 'human' | 'model';
  bookmarked?: boolean;
}): Node => ({
  id: input.id as ULID,
  localId: input.id.slice(0, 6) as Node['localId'],
  loomTreeId: 'tree-1' as ULID,
  content: { type: 'text', text: input.text },
  authorAgentId: (input.authorType === 'human'
    ? 'agent-human'
    : 'agent-model') as ULID,
  authorType: input.authorType,
  contentHash:
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Node['contentHash'],
  createdAt: now,
  metadata: {
    bookmarked: input.bookmarked ?? false,
    pruned: false,
    excluded: false,
  },
});

const makeEdge = (source: string, target: string): Edge => ({
  id: `edge-${source}-${target}` as ULID,
  loomTreeId: 'tree-1' as ULID,
  sources: [{ nodeId: source as ULID, role: 'primary' }],
  targetNodeId: target as ULID,
  edgeType: 'continuation',
  createdAt: now,
});

const tree: LoomTree = {
  id: 'tree-1' as ULID,
  groveId: 'grove-1' as ULID,
  title: 'Test Tree',
  rootNodeId: 'node-a' as ULID,
  mode: 'dialogue',
  systemContext: 'Be kind.',
  createdAt: now,
  updatedAt: now,
};

const humanAgent: Agent = {
  id: 'agent-human' as ULID,
  name: 'Asher',
  type: 'human',
  configuration: {},
  permissions: {
    loomAware: true,
    loomWrite: true,
    loomGenerate: false,
    docRead: true,
    docWrite: true,
  },
  createdAt: now,
  updatedAt: now,
};

describe('open-loom export', () => {
  it('round-trips through the v2 importer with structure intact', async () => {
    const nodes = [
      makeNode({ id: 'node-a', text: 'Hello', authorType: 'human' }),
      makeNode({
        id: 'node-b',
        text: 'Hi there',
        authorType: 'model',
        bookmarked: true,
      }),
      makeNode({ id: 'node-c', text: 'Howdy', authorType: 'model' }),
    ];
    const edges = [makeEdge('node-a', 'node-b'), makeEdge('node-a', 'node-c')];

    const document = await buildOpenLoomDocument({
      tree,
      nodes,
      edges,
      agentsById: new Map([[humanAgent.id, humanAgent]]),
      rawResponsesByNodeId: new Map(),
      currentNodeId: 'node-b',
      exportedAt: now,
    });

    expect(document.format).toBe('open-loom');
    expect(document.version).toBe('2.0');

    const json = JSON.stringify(document);
    expect(detectLoomFormat(JSON.parse(json))).toBe('open-loom-v2');

    const { sourceFormat, document: imported } = parseLoomImport(json);
    expect(sourceFormat).toBe('open-loom-v2');
    const importedTree = imported.trees[0];
    expect(Object.keys(importedTree.nodes)).toHaveLength(3);
    expect(importedTree.edges).toHaveLength(2);
    expect(importedTree.rootNodeIds).toEqual(['node-a']);
    expect(importedTree.currentNodeId).toBe('node-b');
    expect(importedTree.nodes['node-b'].meta?.bookmarked).toBe(true);
    expect(importedTree.nodes['node-b'].author.role).toBe('model');
    expect(importedTree.nodes['node-b'].generation?.contentHash).toMatch(
      /^sha256:/
    );
  });

  it('respects the includeSystemContext export option', async () => {
    const document = await buildOpenLoomDocument({
      tree,
      nodes: [makeNode({ id: 'node-a', text: 'Hello', authorType: 'human' })],
      edges: [],
      agentsById: new Map(),
      rawResponsesByNodeId: new Map(),
      options: { includeSystemContext: false },
    });
    expect(document.trees[0].systemContext).toBeUndefined();
  });
});

describe('renderPathMarkdown', () => {
  it('renders speaker-labelled dialogue and skips empty scaffolding', () => {
    const markdown = renderPathMarkdown({
      tree,
      pathNodes: [
        makeNode({ id: 'node-a', text: '', authorType: 'human' }),
        makeNode({ id: 'node-b', text: 'Hello', authorType: 'human' }),
        makeNode({ id: 'node-c', text: 'Hi!', authorType: 'model' }),
      ],
      agentNamesById: new Map([['agent-human', 'Asher']]),
      exportedAt: now,
    });

    expect(markdown).toContain('# Test Tree');
    expect(markdown).toContain('**Asher:**');
    expect(markdown).toContain('**Model:**');
    expect(markdown).not.toContain('****');
  });
});

describe('foreign format detection and adaptation', () => {
  it('imports Open Loom v1 files (Swift prototype)', () => {
    const v1 = {
      id: 'v1-tree',
      title: 'V1 Tree',
      lastModified: 700000000,
      systemMessage: 'sys',
      rootNodeId: 'r',
      currentNodeId: 'b',
      nodes: {
        r: {
          id: 'r',
          text: 'root',
          author: 'user',
          modelId: '',
          createdTime: 700000000,
          parentId: null,
          childrenIds: ['a', 'b'],
          isBookmarked: false,
        },
        a: {
          id: 'a',
          text: 'branch a',
          author: 'assistant',
          modelId: 'gpt-x',
          createdTime: 700000100,
          parentId: 'r',
          childrenIds: [],
          isBookmarked: true,
          bookmarkTitle: 'fav',
        },
        b: {
          id: 'b',
          text: 'branch b',
          author: 'assistant',
          modelId: 'gpt-x',
          createdTime: 700000200,
          parentId: 'r',
          childrenIds: [],
          isBookmarked: false,
        },
      },
      bookmarkedNodes: {},
    };

    expect(detectLoomFormat(v1)).toBe('open-loom-v1');
    const { document } = parseLoomImport(JSON.stringify(v1));
    const importedTree = document.trees[0];
    expect(importedTree.rootNodeIds).toEqual(['r']);
    expect(importedTree.edges).toHaveLength(2);
    expect(importedTree.nodes['a'].author.role).toBe('model');
    expect(importedTree.nodes['a'].generation?.model).toBe('gpt-x');
    expect(importedTree.nodes['a'].meta?.bookmarked).toBe(true);
    expect(importedTree.nodes['a'].meta?.bookmarkLabel).toBe('fav');
    // Swift reference-date seconds → ISO (2001-01-01 epoch).
    expect(importedTree.nodes['r'].createdAt).toBe(
      new Date(978307200000 + 700000000 * 1000).toISOString()
    );
  });

  it('imports socketteer loom save files', () => {
    const socketteer = {
      root: {
        id: 'root-1',
        text: 'Once upon a time',
        children: [
          {
            id: 'child-1',
            text: ' there was a fox.',
            children: [],
            meta: { source: 'AI', creation_timestamp: '2021-05-01T00:00:00Z' },
            generation: { id: 'resp-1', index: 0 },
            tags: ['bookmark'],
          },
        ],
        meta: { source: 'prompt' },
      },
      model_responses: { 'resp-1': { model: 'davinci' } },
      selected_node_id: 'child-1',
    };

    expect(detectLoomFormat(socketteer)).toBe('socketteer-loom');
    const { document } = parseLoomImport(JSON.stringify(socketteer));
    const importedTree = document.trees[0];
    expect(importedTree.rootNodeIds).toEqual(['root-1']);
    expect(importedTree.currentNodeId).toBe('child-1');
    expect(importedTree.nodes['child-1'].author.role).toBe('model');
    expect(importedTree.nodes['child-1'].generation?.model).toBe('davinci');
    expect(importedTree.nodes['child-1'].meta?.bookmarked).toBe(true);
    expect(importedTree.nodes['root-1'].author.role).toBe('human');
  });

  it('imports loomsidian plugin data with multiple notes', () => {
    const loomsidian = {
      settings: {},
      state: {
        'notes/story.md': {
          current: 'n2',
          hoisted: [],
          searchTerm: '',
          nodes: {
            n1: {
              text: 'seed',
              parentId: null,
              unread: false,
              bookmarked: false,
              collapsed: false,
            },
            n2: {
              text: 'continuation',
              parentId: 'n1',
              unread: true,
              bookmarked: true,
              collapsed: false,
            },
          },
          generating: null,
        },
      },
    };

    expect(detectLoomFormat(loomsidian)).toBe('loomsidian');
    const { document } = parseLoomImport(JSON.stringify(loomsidian));
    expect(document.trees).toHaveLength(1);
    const importedTree = document.trees[0];
    expect(importedTree.title).toBe('notes/story.md');
    expect(importedTree.nodes['n1'].author.role).toBe('human');
    expect(importedTree.nodes['n2'].author.role).toBe('mixed');
    expect(importedTree.nodes['n2'].meta?.bookmarked).toBe(true);
    expect(importedTree.currentNodeId).toBe('n2');
  });

  it('rejects unrecognized documents with a clear error', () => {
    expect(() => parseLoomImport('{"some":"json"}')).toThrow(
      /Unrecognized loom format/
    );
    expect(() => parseLoomImport('not json')).toThrow(/not valid JSON/);
  });
});
