import type { PathSelection } from '@domain/entities';
import type { ContentHash, ULID } from '@domain/value-objects';
import type {
  BufferDraft,
  BufferEditPorts,
  BufferSwitchAction,
} from './buffer-draft';
import type { BufferGraph } from './buffer-graph';
import type { BufferDraftText } from './draft-from-document';
import { planBufferCommand } from './plan-buffer-edit';
import type { ResolvedBufferPath } from './resolve-buffer-path';

export type ReserveOptions = {
  newId(): ULID;
  now(): number;
  selections: readonly PathSelection[];
  /** The switch the command performs, if any. */
  action?: BufferSwitchAction;
  /** The draft this editor reserved last, if any. */
  previous?: BufferDraft;
  /**
   * Whether the command for an operation id may have committed: it was sent
   * and its outcome is unknown or known to be applied.
   */
  isCommitted?: (operationId: ULID) => boolean;
};

const sameList = <T>(a: readonly T[], b: readonly T[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const sameWork = (a: BufferDraft, b: BufferDraftText): boolean =>
  a.pathId === b.pathId &&
  a.expectedRevision === b.expectedRevision &&
  sameList(a.expectedSequence, b.expectedSequence);

const sameText = (a: BufferDraft, b: BufferDraftText): boolean =>
  a.workingTail === b.workingTail &&
  a.edits.length === b.edits.length &&
  a.edits.every(
    (edit, i) =>
      edit.nodeId === b.edits[i].nodeId && edit.text === b.edits[i].text
  );

const sameAction = (
  a: BufferSwitchAction | undefined,
  b: BufferSwitchAction | undefined
): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    a.kind === b.kind &&
    a.position === b.position &&
    a.nodeId === b.nodeId);

/**
 * Whether anything may already have been written under this draft's id: one
 * of its node ids is in the graph, or the caller knows the operation went out.
 */
const wasCommitted = (
  graph: BufferGraph,
  previous: BufferDraft,
  isCommitted: ReserveOptions['isCommitted']
): boolean =>
  previous.nodeIds.some((id) => graph.nodesById.has(id)) ||
  previous.edgeIds.some((id) => graph.edgesById.has(id)) ||
  (isCommitted?.(previous.operationId) ?? false);

/**
 * Fills in the operation id, time and node and edge ids the commands need,
 * in the planner's own allocation order, by planning the command once with
 * recording ports. Reserving again for the same text returns the same draft
 * (a retry replays the same plan). Changed text keeps the operation id and
 * the ids already held, unless something may have been committed under that
 * id: then it takes a new one, so a committed id never names other content.
 */
export const reserveBufferDraft = async (
  graph: BufferGraph,
  path: ResolvedBufferPath,
  text: BufferDraftText,
  options: ReserveOptions
): Promise<BufferDraft> => {
  const { previous, action } = options;
  const reusable =
    previous &&
    sameWork(previous, text) &&
    !wasCommitted(graph, previous, options.isCommitted)
      ? previous
      : undefined;
  if (
    reusable &&
    sameText(reusable, text) &&
    sameAction(reusable.action, action)
  )
    return reusable;

  const nodeIds = [...(reusable?.nodeIds ?? [])];
  const edgeIds = [...(reusable?.edgeIds ?? [])];
  const draft: BufferDraft = {
    ...text,
    operationId: reusable?.operationId ?? options.newId(),
    createdAtMs: reusable?.createdAtMs ?? options.now(),
    nodeIds,
    edgeIds,
    ...(action ? { action } : {}),
  };
  const ports: BufferEditPorts = {
    now: () => new Date(draft.createdAtMs as number),
    nextId: (_operation, kind, index) => {
      const id = options.newId();
      (kind === 'node' ? nodeIds : edgeIds)[index] = id;
      return id;
    },
    hashHuman: async () => 'reservation' as ContentHash,
  };
  await planBufferCommand(
    graph,
    path,
    draft,
    ports,
    options.selections,
    action ?? { kind: 'open' }
  );
  return { ...draft, nodeIds, edgeIds };
};
