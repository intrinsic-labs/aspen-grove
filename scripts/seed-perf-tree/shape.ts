import { createRng } from './rng.ts';

export type ShapeNode = {
  readonly index: number;
  readonly parent: number | null;
  readonly depth: number;
  readonly role: 'human' | 'model';
  /** Rough reply length class for model nodes (tokens), 0 for human nodes. */
  readonly targetTokens: number;
};

export type ShapeOptions = {
  readonly seed: number;
  readonly nodes: number;
  /** Depth of the main path (root is depth 0). */
  readonly depth: number;
};

const LENGTHS = [60, 60, 180, 180, 180, 400, 400, 800] as const;

/**
 * Builds a deterministic dialogue-tree shape: a deep main path, side
 * branches, several bushy regions (3-4 siblings, each continued), then
 * filler growth until `nodes` is reached. Even depths are human turns, odd
 * depths model turns, as the dialogue model expects. Nodes are returned in
 * creation order, which is also sibling order.
 */
export const buildShape = ({
  seed,
  nodes,
  depth,
}: ShapeOptions): ShapeNode[] => {
  const rng = createRng(seed);
  const shape: ShapeNode[] = [];
  const childCount: number[] = [];

  const add = (parent: number | null): number => {
    const d = parent === null ? 0 : shape[parent].depth + 1;
    const role = d % 2 === 0 ? 'human' : 'model';
    const index = shape.length;
    shape.push({
      index,
      parent,
      depth: d,
      role,
      targetTokens: role === 'model' ? rng.pick(LENGTHS) : 0,
    });
    childCount.push(0);
    if (parent !== null) {
      childCount[parent]++;
    }
    return index;
  };
  const full = () => shape.length >= nodes;

  // Main path.
  let cursor = add(null);
  const mainPath = [cursor];
  while (shape[cursor].depth < depth && !full()) {
    cursor = add(cursor);
    mainPath.push(cursor);
  }

  // Side branches: short chains hanging off the main path.
  for (const anchor of mainPath.slice(1, -1)) {
    if (full() || !rng.chance(0.35)) {
      continue;
    }
    let tip = anchor;
    for (let i = rng.int(2, 8); i > 0 && !full(); i--) {
      tip = add(tip);
    }
  }

  // Bushy regions: wide siblings, each continued with 1-3 children per level.
  const bushCount = 6;
  for (let b = 0; b < bushCount && !full(); b++) {
    const hub = mainPath[Math.floor(((b + 0.5) * mainPath.length) / bushCount)];
    let frontier = [hub];
    for (let level = 0; level < 4 && !full(); level++) {
      const next: number[] = [];
      for (const parent of frontier) {
        const width = level === 0 ? rng.int(3, 4) : rng.int(1, 3);
        for (let i = 0; i < width && !full(); i++) {
          next.push(add(parent));
        }
      }
      frontier = next;
    }
  }

  // Filler: grow random nodes, favouring deeper ones, until the target.
  while (!full()) {
    const candidate = rng.int(0, shape.length - 1);
    const parent = shape[candidate];
    if (parent.depth >= depth + 4 || childCount[candidate] >= 4) {
      continue;
    }
    add(candidate);
  }
  return shape;
};
