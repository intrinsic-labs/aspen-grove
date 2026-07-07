import { describe, expect, it } from '@jest/globals';
import type { Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { assembleDialogueContext } from './assemble-dialogue-context';
import { TRUNCATION_MARKER } from './truncate-dialogue-messages';

const now = new Date('2026-03-01T12:00:00.000Z');

let nodeCounter = 0;

const createNode = (input: {
  authorType: 'human' | 'model';
  text: string;
  pruned?: boolean;
  excluded?: boolean;
}): Node => {
  nodeCounter += 1;
  return {
    id: `01KNODE${String(nodeCounter).padStart(19, '0')}` as ULID,
    localId: `node${nodeCounter}` as Node['localId'],
    loomTreeId: '01KTREE0000000000000000000' as ULID,
    content: { type: 'text', text: input.text },
    authorAgentId: '01KAGENT000000000000000000' as ULID,
    authorType: input.authorType,
    contentHash:
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Node['contentHash'],
    createdAt: now,
    metadata: {
      bookmarked: false,
      pruned: input.pruned ?? false,
      excluded: input.excluded ?? false,
    },
  };
};

describe('assembleDialogueContext', () => {
  it('filters out pruned and excluded nodes', () => {
    const nodes = [
      createNode({ authorType: 'human', text: 'Keep first' }),
      createNode({ authorType: 'model', text: 'Pruned reply', pruned: true }),
      createNode({
        authorType: 'model',
        text: 'Excluded reply',
        excluded: true,
      }),
      createNode({ authorType: 'model', text: 'Keep reply' }),
    ];

    const result = assembleDialogueContext({ nodes });

    expect(result.messages).toEqual([
      { role: 'user', content: 'Keep first' },
      { role: 'assistant', content: 'Keep reply' },
    ]);
    expect(result.truncated).toBe(false);
    expect(result.droppedMessageCount).toBe(0);
  });

  it('merges consecutive same-author nodes after exclusion filtering', () => {
    const nodes = [
      createNode({ authorType: 'human', text: 'First question' }),
      createNode({ authorType: 'model', text: 'Removed', excluded: true }),
      createNode({ authorType: 'human', text: 'Second question' }),
      createNode({ authorType: 'model', text: 'Answer' }),
    ];

    const result = assembleDialogueContext({ nodes });

    expect(result.messages).toEqual([
      { role: 'user', content: 'First question\n\nSecond question' },
      { role: 'assistant', content: 'Answer' },
    ]);
  });

  it('combines agent system prompt before tree system context', () => {
    const result = assembleDialogueContext({
      nodes: [createNode({ authorType: 'human', text: 'Hi' })],
      agentSystemPrompt: 'Agent prompt',
      treeSystemContext: 'Tree context',
    });

    expect(result.systemContext).toBe('Agent prompt\n\nTree context');
  });

  it('truncates the middle while preserving system context and recent messages', () => {
    // Alternating turns of 100 estimated tokens each (400 chars).
    const nodes = Array.from({ length: 10 }, (_, index) =>
      createNode({
        authorType: index % 2 === 0 ? 'human' : 'model',
        text: `msg${index}-`.padEnd(400, 'x'),
      })
    );

    const result = assembleDialogueContext({
      nodes,
      agentSystemPrompt: 'Agent prompt',
      truncation: {
        maxContextTokens: 704,
        responseTokenBuffer: 0,
        minimumRecentNodes: 4,
      },
    });

    expect(result.systemContext).toBe('Agent prompt');
    expect(result.truncated).toBe(true);
    expect(result.droppedMessageCount).toBeGreaterThan(0);
    expect(result.messages[0]?.content.startsWith('msg0-')).toBe(true);
    expect(
      result.messages.some((message) =>
        message.content.startsWith(TRUNCATION_MARKER)
      )
    ).toBe(true);
    expect(
      result.messages[result.messages.length - 1]?.content.startsWith('msg9-')
    ).toBe(true);
  });

  it('does not truncate small contexts with default options', () => {
    const result = assembleDialogueContext({
      nodes: [
        createNode({ authorType: 'human', text: 'Hello' }),
        createNode({ authorType: 'model', text: 'Hi there' }),
      ],
    });

    expect(result.truncated).toBe(false);
    expect(result.messages).toHaveLength(2);
  });
});
