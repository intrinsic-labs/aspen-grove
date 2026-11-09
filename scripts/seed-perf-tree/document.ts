import type { OpenLoomDocument } from '../../src/application/services/open-loom/format.ts';
import type { PlanNode } from './plan.ts';

const BASE_TIME = Date.parse('2026-01-01T00:00:00.000Z');

export type DocumentOptions = {
  readonly plan: readonly PlanNode[];
  readonly texts: ReadonlyMap<number, string>;
  readonly seed: number;
  readonly model: string;
  readonly label: string;
};

const nodeId = (index: number) => `n-${String(index).padStart(4, '0')}`;

/** Assembles an Open Loom v2 document (docs/open-loom/spec.md) from a filled plan. */
export const buildDocument = (options: DocumentOptions): OpenLoomDocument => {
  const { plan, texts, model } = options;
  const at = (index: number) =>
    new Date(BASE_TIME + index * 1000).toISOString();

  const nodes: OpenLoomDocument['trees'][number]['nodes'] = Object.fromEntries(
    plan.map((node) => {
      const isModel = node.role === 'model';
      return [
        nodeId(node.index),
        {
          id: nodeId(node.index),
          content: [
            { type: 'text' as const, text: texts.get(node.index) ?? '' },
          ],
          author: isModel
            ? { role: 'model' as const, name: model }
            : { role: 'human' as const },
          createdAt: at(node.index),
          // A few bookmarks so the bookmarks sheet has something to load.
          meta:
            node.index % 61 === 7
              ? { bookmarked: true, bookmarkLabel: `seed ${node.index}` }
              : undefined,
          generation: isModel ? { provider: 'openrouter', model } : undefined,
        },
      ];
    })
  );

  const edges = plan
    .filter((node) => node.parent !== null)
    .map((node) => ({
      id: `e-${String(node.index).padStart(4, '0')}`,
      type: 'continuation',
      sources: [
        { nodeId: nodeId(node.parent as number), role: 'primary' as const },
      ],
      targetNodeId: nodeId(node.index),
      createdAt: at(node.index),
    }));

  // Open on the deepest node of the first-created path (the main path).
  let current = 0;
  for (const node of plan) {
    if (node.depth > plan[current].depth) {
      current = node.index;
    }
  }

  return {
    format: 'open-loom',
    version: '2.0',
    exportedAt: at(plan.length),
    generator: { name: 'aspen-grove seed-perf-tree' },
    trees: [
      {
        id: `perf-seed-${options.seed}`,
        title: `Perf seed ${options.seed} (${plan.length} nodes, ${options.label})`,
        mode: 'dialogue',
        systemContext: '',
        rootNodeIds: [nodeId(0)],
        currentNodeId: nodeId(current),
        createdAt: at(0),
        updatedAt: at(plan.length),
        nodes,
        edges,
      },
    ],
  };
};
