import type { ULID } from '@domain/value-objects';
import type { BufferDraft } from './buffer-draft';
import type { BufferDocument } from './document-ranges';
import { runsText } from './authorship-runs';

/** The text half of a draft: what the user typed, before ids are reserved. */
export type BufferDraftText = Pick<
  BufferDraft,
  | 'treeId'
  | 'pathId'
  | 'ownerAgentId'
  | 'expectedSequence'
  | 'expectedRevision'
  | 'edits'
  | 'workingTail'
>;

/** What the editor was opened on: the identities and literal passage text. */
export type BufferDraftBase = {
  readonly treeId: ULID;
  readonly pathId: ULID;
  readonly ownerAgentId: ULID;
  readonly sequence: readonly ULID[];
  readonly revision: number;
  readonly passages: readonly {
    readonly nodeId: ULID;
    readonly text: string;
  }[];
};

/**
 * The draft text for an edited document. Text is literal: whitespace, blank
 * lines, CRLF and an emptied passage are carried exactly as typed. Only
 * passages whose text changed are edits, keyed by their original node id.
 * With nothing changed there is no draft, so no version can be written;
 * `keepEmpty` is for a switch, which needs a command even with no typing.
 */
export const draftFromDocument = (
  base: BufferDraftBase,
  document: BufferDocument,
  options: { readonly keepEmpty?: boolean } = {}
): BufferDraftText | null => {
  const current = new Map(
    document.passages.map((passage) => [passage.id, runsText(passage.runs)])
  );
  const edits = base.passages.flatMap(({ nodeId, text }) => {
    const now = current.get(nodeId);
    return now === undefined || now === text ? [] : [{ nodeId, text: now }];
  });
  const workingTail = runsText(document.tail);
  if (!options.keepEmpty && edits.length === 0 && workingTail === '')
    return null;
  return {
    treeId: base.treeId,
    pathId: base.pathId,
    ownerAgentId: base.ownerAgentId,
    expectedSequence: base.sequence,
    expectedRevision: base.revision,
    edits,
    workingTail,
  };
};
