import { describe, expect, it } from '@jest/globals';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Agent, Edge, Node } from '@domain/entities';
import type { ULID } from '@domain/value-objects';
import { parseLoomImport } from '@application/services/open-loom';
import { ImportLoomTreeUseCase } from '@application/use-cases/ImportLoomTreeUseCase';
import { openReplyCache } from './cache.ts';
import { fakeCompleter, generateDocument } from './generate.ts';
import type { Completer } from './types.ts';

const options = {
  seed: 1,
  nodes: 520,
  depth: 40,
  model: 'fake/model',
  concurrency: 4,
  label: 'fake',
};

const now = new Date('2026-01-01T00:00:00.000Z');
const modelAgent = {
  id: '01KSHARED00000000000000000' as ULID,
  name: 'Default',
  type: 'model',
  modelRef: 'openrouter:some/model',
  configuration: {},
  permissions: {},
  createdAt: now,
  updatedAt: now,
} as unknown as Agent;

/** Runs the real use case against minimal in-memory repositories. */
const importThroughUseCase = async (raw: string) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const pathNodes: ULID[] = [];
  const useCase = new ImportLoomTreeUseCase({
    loomTreeRepository: {
      create: async (input) =>
        ({ ...input, createdAt: now, updatedAt: now }) as never,
      hardDelete: async () => true,
    },
    nodeRepository: {
      create: async (input) => {
        const node = { ...input, metadata: {} } as unknown as Node;
        nodes.push(node);
        return node;
      },
      updateMetadata: async (id) => nodes.find((n) => n.id === id) as Node,
      hardDelete: async () => true,
    },
    edgeRepository: {
      create: async (input) => {
        const edge = { ...input, id: `e${edges.length}` } as unknown as Edge;
        edges.push(edge);
        return edge;
      },
    },
    agentRepository: {
      create: async (input) => ({
        ...modelAgent,
        ...input,
        id: '01KIMPORT000000000000000000' as ULID,
      }),
      findById: async () => modelAgent,
      findSharedModels: async () => [modelAgent],
    },
    pathRepository: {
      create: async () =>
        ({ id: '01KPATH0000000000000000000' as ULID }) as never,
      appendNode: async (_pathId, nodeId) => {
        pathNodes.push(nodeId);
        return {} as never;
      },
    },
    pathStateRepository: { create: async () => ({}) as never },
    userPreferencesRepository: {
      get: async () => ({}) as never,
      update: async () => ({}) as never,
    },
  });
  const result = await useCase.execute({
    groveId: '01KGROVE000000000000000000' as ULID,
    ownerAgentId: '01KOWNER000000000000000000' as ULID,
    raw,
  });
  return { result, nodes, edges, pathNodes };
};

describe('seed-perf-tree (--fake mode)', () => {
  it('produces an Open Loom file the real importer accepts with 500+ nodes', async () => {
    const document = await generateDocument({
      ...options,
      complete: fakeCompleter,
    });
    const raw = JSON.stringify(document);

    const parsed = parseLoomImport(raw);
    expect(parsed.sourceFormat).toBe('open-loom-v2');

    const { result, nodes, edges, pathNodes } = await importThroughUseCase(raw);
    expect(result.warnings).toEqual([]);
    expect(result.trees[0].nodeCount).toBeGreaterThanOrEqual(500);
    expect(nodes).toHaveLength(result.trees[0].nodeCount);
    expect(edges).toHaveLength(nodes.length - 1);
    // Opens on the deepest path (40+ turns).
    expect(pathNodes.length).toBeGreaterThanOrEqual(options.depth + 1);
    expect(
      nodes.filter((n) => n.authorType === 'model').length
    ).toBeGreaterThan(200);
  });

  it('is deterministic for a seed and differs across seeds', async () => {
    const a = await generateDocument({ ...options, complete: fakeCompleter });
    const b = await generateDocument({ ...options, complete: fakeCompleter });
    const c = await generateDocument({
      ...options,
      seed: 2,
      complete: fakeCompleter,
    });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it('has deep and wide structure', async () => {
    const { trees } = await generateDocument({
      ...options,
      complete: fakeCompleter,
    });
    const children = new Map<string, number>();
    for (const edge of trees[0].edges) {
      const parent = edge.sources[0].nodeId;
      children.set(parent, (children.get(parent) ?? 0) + 1);
    }
    expect(Math.max(...children.values())).toBeGreaterThanOrEqual(3);
    expect(
      [...children.values()].filter((n) => n >= 3).length
    ).toBeGreaterThanOrEqual(6);
  });

  it('resumes from the reply cache without calling the model again', async () => {
    const cache = openReplyCache(
      join(mkdtempSync(join(tmpdir(), 'seed-perf-')), 'c.jsonl')
    );
    let calls = 0;
    const counting: Completer = async (request) => {
      calls++;
      return fakeCompleter(request);
    };
    const small = { ...options, nodes: 80, depth: 12, cache };
    const first = await generateDocument({ ...small, complete: counting });
    const firstCalls = calls;
    expect(firstCalls).toBeGreaterThan(0);
    const second = await generateDocument({ ...small, complete: counting });
    expect(calls).toBe(firstCalls);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
