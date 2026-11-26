import { Q, type Database, type Model } from '@nozbe/watermelondb';
import type { BufferMutation } from '@application/repositories/core/IBufferMutationRepository';
import { createULID } from '@domain/value-objects';
import type LoomTree from '../model/LoomTree';
import { Path, PathNode, PathSelection, PathState } from '../model/Path';

export async function loadBufferPathRows(db: Database, pathId: string) {
  const forPath = Q.where('path_id', pathId);
  const [sequence, selections, states] = await Promise.all([
    db
      .get<PathNode>('path_nodes')
      .query(forPath, Q.sortBy('position', Q.asc))
      .fetch(),
    db.get<PathSelection>('path_selections').query(forPath).fetch(),
    db
      .get<PathState>('path_states')
      .query(forPath, Q.where('mode', 'buffer'))
      .fetch(),
  ]);
  return { sequence, selections, states };
}

export function prepareBufferPath(
  db: Database,
  plan: BufferMutation,
  tree: LoomTree,
  path: Path,
  rows: Awaited<ReturnType<typeof loadBufferPathRows>>
): Model[] {
  const at = new Date(
    Math.max(plan.createdAt.getTime(), plan.expectedRevision + 1)
  );
  const changes: Model[] = rows.sequence.map((row) =>
    row.prepareDestroyPermanently()
  );
  plan.sequence.forEach((nodeId, position) => {
    changes.push(
      db.get<PathNode>('path_nodes').prepareCreate((row) => {
        // The first membership records the last acknowledged command, even for a pure switch.
        row._raw.id = position === 0 ? plan.operationId : createULID();
        row.pathId = path.id;
        row.position = position;
        row.nodeId = nodeId;
        row.createdAt = at;
      })
    );
  });
  const current = rows.states.find((row) => row.agentId === plan.ownerAgentId);
  if (plan.cursor) {
    const cursor = plan.cursor;
    const write = (row: PathState) => {
      row.pathId = path.id;
      row.agentId = plan.ownerAgentId;
      row.mode = 'buffer';
      row.activeNodeId = cursor;
      row.updatedAt = at;
    };
    changes.push(
      current
        ? current.prepareUpdate(write)
        : db.get<PathState>('path_states').prepareCreate((row) => {
            row._raw.id = createULID();
            write(row);
          })
    );
  } else if (current) changes.push(current.prepareDestroyPermanently());

  const byTarget = new Map(
    rows.selections.map((row) => [row.targetNodeId, row])
  );
  for (const selection of plan.selectionUpserts) {
    const write = (row: PathSelection) => {
      row.pathId = path.id;
      row.targetNodeId = selection.targetNodeId;
      row.selectedEdgeId = selection.selectedEdgeId ?? null;
      row.selectedSourceNodeId = selection.selectedSourceNodeId ?? null;
      row.updatedAt = at;
    };
    const old = byTarget.get(selection.targetNodeId);
    changes.push(
      old
        ? old.prepareUpdate(write)
        : db.get<PathSelection>('path_selections').prepareCreate((row) => {
            row._raw.id = createULID();
            write(row);
          })
    );
  }
  changes.push(
    path.prepareUpdate((row) => {
      row.updatedAt = at;
    }),
    tree.prepareUpdate((row) => {
      row.lastMessageAt = new Date(
        Math.max(tree.lastMessageAt?.getTime() ?? 0, at.getTime())
      );
    })
  );
  return changes;
}
