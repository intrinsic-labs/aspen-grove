import type { BufferMutation } from '@application/repositories/core/IBufferMutationRepository';
import type {
  Edge,
  EdgeSource,
  Node,
  PathSelection,
  TextContent,
} from '@domain/entities';
import { createLocalId, type ULID } from '@domain/value-objects';
import type { BufferDraft, BufferEditPorts } from './buffer-draft';
import { indexBufferGraph, type BufferGraph } from './buffer-graph';
import {
  resolveBufferPath,
  type ResolvedBufferPath,
  type BufferPathAction,
} from './resolve-buffer-path';

import { bufferPassageText } from './buffer-passage-text';

export type { BufferDraft, BufferEditPorts } from './buffer-draft';

const sameSequence = (a: readonly ULID[], b: readonly ULID[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

const primary = (nodeId: ULID): EdgeSource => ({ role: 'primary', nodeId });

/** Plan against one immutable snapshot. Only primary sources carry the document. */
export async function planBufferEdit(
  graph: BufferGraph,
  path: ResolvedBufferPath,
  draft: BufferDraft,
  ports: BufferEditPorts
): Promise<BufferMutation> {
  return (
    await planBufferCommand(graph, path, draft, ports, [], { kind: 'open' })
  ).mutation;
}

export async function planBufferCommand(
  graph: BufferGraph,
  path: ResolvedBufferPath,
  draft: BufferDraft,
  ports: BufferEditPorts,
  selections: readonly PathSelection[],
  action: BufferPathAction
): Promise<{ mutation: BufferMutation; result: ResolvedBufferPath }> {
  const {
    treeId,
    ownerAgentId,
    pathId,
    operationId,
    expectedSequence,
    expectedRevision,
  } = draft;
  if (!sameSequence(expectedSequence, path.nodeIds))
    throw new Error('Stale buffer draft sequence');
  const originals = path.nodeIds.map((id) => {
    const node = graph.nodesById.get(id);
    if (!node || node.loomTreeId !== treeId)
      throw new Error('Buffer path outside draft tree');
    return node;
  });
  const edits = new Map(draft.edits.map((edit) => [edit.nodeId, edit.text]));
  const members = new Set(path.nodeIds);
  if (
    edits.size !== draft.edits.length ||
    draft.edits.some((edit) => !members.has(edit.nodeId))
  ) {
    throw new Error(
      'Buffer edits must identify distinct passages on this path'
    );
  }

  const createdAt =
    draft.createdAtMs === undefined
      ? ports.now(operationId)
      : new Date(draft.createdAtMs);
  const nodeInserts: Node[] = [];
  const edgeInserts: Edge[] = [];
  const sourceAdditions: { edgeId: ULID; source: EdgeSource }[] = [];
  const localIds = new Set(
    [...graph.nodesById.values()].map((node) => node.localId)
  );
  const usedIds = new Set([
    ...graph.nodesById.keys(),
    ...graph.edgesById.keys(),
  ]);
  function reserve(kind: 'node' | 'edge'): ULID {
    const index = kind === 'node' ? nodeInserts.length : edgeInserts.length;
    const pool = kind === 'node' ? draft.nodeIds : draft.edgeIds;
    const id = pool[index] ?? ports.nextId(operationId, kind, index);
    if (usedIds.has(id)) throw new Error('Duplicate buffer mutation id');
    usedIds.add(id);
    return id;
  }

  async function insertHuman(
    text: string,
    parent?: Node,
    editedFrom?: ULID
  ): Promise<Node> {
    const id = reserve('node');
    const localId = createLocalId(id, localIds);
    localIds.add(localId);
    const content: TextContent = { type: 'text', text };
    const contentHash = await ports.hashHuman(
      content,
      parent ? [parent.contentHash] : [],
      createdAt,
      ownerAgentId
    );
    const node: Node = {
      id,
      localId,
      loomTreeId: treeId,
      createdAt,
      content,
      contentHash,
      editedFrom,
      authorAgentId: ownerAgentId,
      authorType: 'human',
      metadata: {
        bookmarked: false,
        pruned: false,
        excluded: false,
        buffer: parent ? { creationParentId: parent.id } : {},
      },
    };
    nodeInserts.push(node);
    return node;
  }

  function insertEdge(sources: EdgeSource[], targetNodeId: ULID): void {
    edgeInserts.push({
      id: reserve('edge'),
      loomTreeId: treeId,
      createdAt,
      sources,
      targetNodeId,
      edgeType: 'continuation',
    });
  }

  // Sign the tail on the old leaf before creating any replacement versions.
  const leaf = originals[originals.length - 1];
  const tail = draft.workingTail
    ? await insertHuman(draft.workingTail, leaf)
    : undefined;
  const sequence: ULID[] = [];
  const versionByFamily = new Map<ULID, ULID>();
  let parent: Node | undefined;
  for (const original of originals) {
    const text = edits.get(original.id);
    let active = original;
    if (text !== undefined && text !== bufferPassageText(original)) {
      active = await insertHuman(text, parent, original.id);
      versionByFamily.set(graph.familyOf.get(original.id)!, active.id);
    }
    sequence.push(active.id);
    parent = active;
  }

  // A single original edge can name multiple versions of the same family.
  // Compute its addition once and use the augmented sources for incoming copies too.
  const additionsByEdge = new Map<ULID, EdgeSource[]>();
  for (const [family, version] of versionByFamily) {
    const affected = new Set<Edge>();
    for (const member of graph.versionsOf.get(family)!) {
      for (const edge of graph.outgoing.get(member.id) ?? [])
        affected.add(edge);
    }
    for (const edge of affected) {
      const source = primary(version);
      const additions = additionsByEdge.get(edge.id) ?? [];
      additions.push(source);
      additionsByEdge.set(edge.id, additions);
      sourceAdditions.push({ edgeId: edge.id, source });
    }
  }

  if (tail) {
    sequence.push(tail.id);
    if (leaf) {
      const family = graph.familyOf.get(leaf.id)!;
      const sources = [
        primary(leaf.id),
        ...graph.versionsOf
          .get(family)!
          .filter((node) => node.id !== leaf.id)
          .map((node) => primary(node.id)),
      ];
      const replacement = versionByFamily.get(family);
      if (replacement) sources.push(primary(replacement));
      insertEdge(sources, tail.id);
    }
  }
  for (const node of nodeInserts) {
    if (!node.editedFrom) continue;
    for (const edge of graph.incoming.get(node.editedFrom) ?? []) {
      insertEdge(
        [...edge.sources, ...(additionsByEdge.get(edge.id) ?? [])],
        node.id
      );
    }
  }

  // Ask the same resolver used on open which incoming choices need persistence.
  const updated = nodeInserts.length
    ? indexBufferGraph(
        [...graph.nodesById.values(), ...nodeInserts],
        [
          ...Array.from(graph.edgesById.values(), (edge) => {
            const additions = additionsByEdge.get(edge.id);
            return additions
              ? { ...edge, sources: [...edge.sources, ...additions] }
              : edge;
          }),
          ...edgeInserts,
        ]
      )
    : graph;
  const resolved = resolveBufferPath(updated, sequence, [], { kind: 'open' });
  if (!sameSequence(sequence, resolved.nodeIds))
    throw new Error('Buffer mutation would change the intended path');
  const result =
    action.kind === 'open'
      ? resolved
      : resolveBufferPath(updated, sequence, selections, action);
  if (result.issues.some((issue) => issue.kind === 'action-rejected'))
    throw new Error('Invalid buffer switch');
  const mutation: BufferMutation = {
    operationId,
    treeId,
    ownerAgentId,
    pathId,
    createdAt,
    expectedSequence,
    expectedRevision,
    nodeInserts,
    edgeInserts,
    sourceAdditions,
    sequence: result.nodeIds,
    cursor: result.leafId,
    selectionUpserts: result.selections.map((selection) => ({
      ...selection,
      pathId,
    })),
  };
  return { mutation, result };
}
