import { describe, expect, it } from '@jest/globals';
import { buildOpenLoomDocument } from '@application/services/open-loom';
import type { LoomTree, Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { initialExportDraft, toExportOptions } from './export-sheet-options';

const createdAt = new Date('2026-11-12T12:00:00.000Z');

const textNode = (
  id: string,
  authorType: Node['authorType'],
  text: string
): Node => ({
  id: id as ULID,
  localId: id as Node['localId'],
  loomTreeId: 'tree' as ULID,
  content: { type: 'text', text },
  authorAgentId: 'agent' as ULID,
  authorType,
  contentHash: 'a'.repeat(64) as Node['contentHash'],
  createdAt,
  metadata: { bookmarked: false, pruned: false, excluded: false },
});

const exportWithSystemNode = (includeSystemMessage: boolean) =>
  buildOpenLoomDocument({
    tree: {
      id: 'tree' as ULID,
      groveId: 'grove' as ULID,
      title: 'Tree',
      rootNodeId: 'sys' as ULID,
      mode: 'dialogue',
      systemContext: 'Tree context',
      createdAt,
      updatedAt: createdAt,
    } satisfies LoomTree,
    nodes: [
      textNode('sys', 'system', 'Secret system prompt'),
      textNode('hi', 'human', 'Hello'),
    ],
    edges: [],
    agentsById: new Map(),
    rawResponsesByNodeId: new Map(),
    options: toExportOptions({
      ...initialExportDraft({ title: 'Tree' }),
      includeSystemMessage,
    }),
  });

describe('export sheet options', () => {
  it('starts from the saved title and description, everything included', () => {
    expect(initialExportDraft({ title: 'Tree' })).toEqual({
      title: 'Tree',
      description: '',
      includeSystemMessage: true,
      includeBookmarks: true,
    });
  });

  it('leaves an empty description out and maps the toggles', () => {
    expect(
      toExportOptions({
        title: 'Renamed',
        description: '',
        includeSystemMessage: false,
        includeBookmarks: false,
      })
    ).toEqual({
      title: 'Renamed',
      description: null,
      includeSystemContext: false,
      includeAgentSystemPrompts: false,
      includeSystemNodeContent: false,
      includeBookmarks: false,
    });
  });

  it('keeps a description that was typed', () => {
    const draft = {
      ...initialExportDraft({ title: 'Tree', description: 'About' }),
    };
    expect(toExportOptions(draft).description).toBe('About');
  });

  it('leaves system-authored nodes’ text out with Include System Message off', async () => {
    const [tree] = (await exportWithSystemNode(false)).trees;
    expect(tree.systemContext).toBeUndefined();
    expect(tree.nodes.sys?.content).toEqual([{ type: 'text', text: '' }]);
    expect(tree.nodes.sys?.author.role).toBe('system');
    expect(tree.nodes.hi?.content).toEqual([{ type: 'text', text: 'Hello' }]);
    expect(JSON.stringify(tree)).not.toContain('Secret system prompt');
  });

  it('keeps them with Include System Message on', async () => {
    const [tree] = (await exportWithSystemNode(true)).trees;
    expect(tree.nodes.sys?.content).toEqual([
      { type: 'text', text: 'Secret system prompt' },
    ]);
  });
});
