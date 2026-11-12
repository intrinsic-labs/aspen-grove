import { describe, expect, it } from '@jest/globals';
import type { Agent, Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { resolveNodeModelLabels } from './resolve-node-model-labels';

const id = (name: string) => name as ULID;

const node = (
  name: string,
  authorType: Node['authorType'],
  authorAgentId = 'agent'
): Pick<Node, 'id' | 'authorType' | 'authorAgentId'> => ({
  id: id(name),
  authorType,
  authorAgentId: id(authorAgentId),
});

const dependencies = (
  recorded: Record<string, string>,
  agents: Record<string, string>
) => {
  const lookups: ULID[][] = [];
  return {
    lookups,
    deps: {
      rawApiResponseRepository: {
        findModelIdentifiersByNodeIds: async (nodeIds: readonly ULID[]) => {
          lookups.push([...nodeIds]);
          return new Map(
            nodeIds.flatMap((nodeId) =>
              recorded[nodeId] ? [[nodeId, recorded[nodeId]] as const] : []
            )
          );
        },
      },
      agentRepository: {
        findById: async (agentId: ULID) =>
          agents[agentId]
            ? ({ id: agentId, name: agents[agentId] } as Agent)
            : null,
      },
    },
  };
};

describe('resolveNodeModelLabels', () => {
  it('labels model nodes by the model their response recorded', async () => {
    const { deps, lookups } = dependencies(
      { m1: 'anthropic/claude-3.7-sonnet', m2: 'mock-model' },
      {}
    );
    const labels = await resolveNodeModelLabels(
      [node('m1', 'model'), node('m2', 'model'), node('h', 'human')],
      deps
    );
    expect(labels.get(id('m1'))).toBe('anthropic/claude-3.7-sonnet');
    expect(labels.get(id('m2'))).toBe('mock-model');
    expect(lookups).toEqual([[id('m1'), id('m2')]]);
  });

  it('calls people "User" and system messages "System"', async () => {
    const { deps, lookups } = dependencies({}, {});
    const labels = await resolveNodeModelLabels(
      [node('h', 'human'), node('s', 'system')],
      deps
    );
    expect(labels.get(id('h'))).toBe('User');
    expect(labels.get(id('s'))).toBe('System');
    expect(lookups).toEqual([]);
  });

  it('falls back to the author agent, then to "Model", without a response', async () => {
    const { deps } = dependencies({}, { imported: 'Claude 3 Opus' });
    const labels = await resolveNodeModelLabels(
      [node('m1', 'model', 'imported'), node('m2', 'model', 'gone')],
      deps
    );
    expect(labels.get(id('m1'))).toBe('Claude 3 Opus');
    expect(labels.get(id('m2'))).toBe('Model');
  });
});
