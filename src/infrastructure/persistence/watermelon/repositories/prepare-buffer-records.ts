import type { Database, Model } from '@nozbe/watermelondb';
import type { BufferMutation } from '@application/repositories/core/IBufferMutationRepository';
import type { EdgeSource } from '@domain/entities';
import { createULID } from '@domain/value-objects';
import { Edge, EdgeSource as Source } from '../model/Edge';
import Node from '../model/Node';
import { writeNodeFields } from './write-node-fields';

export function prepareBufferRecords(
  db: Database,
  plan: BufferMutation,
  originals: ReadonlyMap<string, Node>
): Model[] {
  const records: Model[] = [];
  const source = (edgeId: string, value: EdgeSource) =>
    db.get<Source>('edge_sources').prepareCreate((row) => {
      row._raw.id = createULID();
      row.edgeId = edgeId;
      row.sourceNodeId = value.nodeId;
      row.role = value.role;
    });
  for (const node of plan.nodeInserts) {
    const original = node.editedFrom && originals.get(node.editedFrom);
    records.push(
      db
        .get<Node>('nodes')
        .prepareCreate((row) =>
          writeNodeFields(
            row,
            node,
            original?.versionGroupId ?? original?.id ?? node.id
          )
        )
    );
  }
  for (const edge of plan.edgeInserts) {
    records.push(
      db.get<Edge>('edges').prepareCreate((row) => {
        row._raw.id = edge.id;
        row.loomTreeId = edge.loomTreeId;
        row.targetNodeId = edge.targetNodeId;
        row.edgeType = edge.edgeType;
        row.createdAt = edge.createdAt;
      })
    );
    records.push(...edge.sources.map((value) => source(edge.id, value)));
  }
  for (const addition of plan.sourceAdditions)
    records.push(source(addition.edgeId, addition.source));
  return records;
}
