import type { Replacement as HostReplacement } from '@application/services/buffer/apply-replacement';
import type { AuthorshipRun } from '@application/services/buffer/authorship-runs';

/**
 * The messages between the React Native host and the CodeMirror page, and the
 * pure range arithmetic both sides share. Offsets are UTF-16 code units, the
 * unit CodeMirror counts in and native selection reports. The whole text
 * crosses the bridge once per load (`load`), or when the host asks for a
 * checkpoint after a revision gap; typing sends only replacements and the
 * host answers with acknowledgements, never text.
 */

/** Everything the page needs to draw itself, passed on load. */
export type WebEditorStyle = {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly paddingTop: number;
  readonly paddingHorizontal: number;
  readonly paddingBottom: number;
  readonly humanColor: string;
  readonly modelColor: string;
  readonly placeholderColor: string;
  readonly backgroundColor: string;
  readonly placeholder: string;
  /** Page logs a one-line summary after typing settles (measurement). */
  readonly diagnostics: boolean;
};

/** A half-open `[from, to)` range of model-authored text. */
export type ModelRange = readonly [number, number];

export type LoadMessage = {
  readonly type: 'load';
  /** Identifies this document load; edits from an older epoch are ignored. */
  readonly epoch: number;
  readonly text: string;
  readonly modelRanges: readonly ModelRange[];
  /**
   * Where each owner of the document ends: the shared prefix, the current
   * sibling ending, then the tail (the document's length). The page keeps
   * them through every edit with the host's own planner, so a checkpoint
   * says which owner each character belongs to.
   */
  readonly ends: readonly number[];
  readonly style: WebEditorStyle;
};

/** The host applied everything up to `revision`; it carries no text. */
export type AckMessage = {
  readonly type: 'ack';
  readonly epoch: number;
  readonly revision: number;
};

/** The host saw a revision gap and wants the page's whole state. */
export type CheckpointRequestMessage = {
  readonly type: 'checkpointRequest';
  readonly epoch: number;
};

/**
 * The host is about to replace the document and wants any composition
 * committed first. The page answers with a `composition` status.
 */
export type EndCompositionMessage = {
  readonly type: 'endComposition';
  readonly epoch: number;
};

export type HostMessage =
  | LoadMessage
  | AckMessage
  | CheckpointRequestMessage
  | EndCompositionMessage;

/** `[from, to)` of the pre-edit document becomes `insert`. */
export type Replacement = {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
};

export type Selection = { readonly anchor: number; readonly head: number };

export type ChangesMessage = {
  readonly type: 'changes';
  readonly epoch: number;
  /** The revision this edit builds on; a mismatch at the host is a gap. */
  readonly prevRevision: number;
  /** Counts edits since the load; `prevRevision + 1`. */
  readonly revision: number;
  /** In document order, all against the pre-edit document. */
  readonly replacements: readonly Replacement[];
  readonly selection: Selection;
  readonly composing: boolean;
  /**
   * The exact model ranges after the edit, sent only for undo and redo:
   * restored text is not new typing, so it keeps the authorship it had.
   */
  readonly modelRanges?: readonly ModelRange[];
};

/** The page's full state at `revision`, sent when the host asks. */
export type CheckpointMessage = {
  readonly type: 'checkpoint';
  readonly epoch: number;
  readonly revision: number;
  readonly text: string;
  readonly modelRanges: readonly ModelRange[];
  /** The owner boundaries as the page tracked them (see `LoadMessage.ends`). */
  readonly ends: readonly number[];
  /** The owner that kept left affinity, as an index into `ends`, if any. */
  readonly hold?: number;
  readonly selection: Selection;
  /** Whether an IME composition is still active when the checkpoint is taken. */
  readonly composing: boolean;
};

/**
 * Whether an IME composition is active, sent when one ends. An edit says so
 * itself (`ChangesMessage.composing`); this covers a composition that ends
 * without changing the text (a cancel, or a candidate equal to what was typed).
 */
export type CompositionMessage = {
  readonly type: 'composition';
  readonly epoch: number;
  readonly composing: boolean;
};

/**
 * The user moved the caret or selection without editing. Left affinity
 * belongs to a caret that has not moved, so the host drops it, as the page
 * already has. Sent once per hold, only while an owner holds it.
 */
export type SelectionMessage = {
  readonly type: 'selection';
  readonly epoch: number;
  readonly selection: Selection;
};

export type EditorMessage =
  | { readonly type: 'ready' }
  | SelectionMessage
  | ChangesMessage
  | CheckpointMessage
  | CompositionMessage;

export const encodeHostMessage = (message: HostMessage): string =>
  JSON.stringify(message);

const isReplacement = (value: unknown): value is Replacement => {
  const r = value as Replacement | null;
  return (
    typeof r === 'object' &&
    r !== null &&
    Number.isInteger(r.from) &&
    Number.isInteger(r.to) &&
    r.from >= 0 &&
    r.to >= r.from &&
    typeof r.insert === 'string'
  );
};

const isRange = (value: unknown): value is ModelRange =>
  Array.isArray(value) &&
  value.length === 2 &&
  Number.isInteger(value[0]) &&
  Number.isInteger(value[1]) &&
  value[0] >= 0 &&
  value[1] >= value[0];

const isRanges = (value: unknown): value is readonly ModelRange[] =>
  Array.isArray(value) && value.every(isRange);

const isEnds = (value: unknown): value is readonly number[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (end, i) =>
      Number.isInteger(end) && end >= 0 && (i === 0 || end >= value[i - 1])
  );

const isSelection = (value: unknown): value is Selection => {
  const s = value as Selection | null;
  return (
    typeof s === 'object' &&
    s !== null &&
    Number.isInteger(s.anchor) &&
    Number.isInteger(s.head)
  );
};

/** The page's message, or null for anything malformed (never trusted). */
export const parseEditorMessage = (raw: string): EditorMessage | null => {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const m = data as Record<string, unknown> | null;
  if (typeof m !== 'object' || m === null) {
    return null;
  }
  if (m.type === 'ready') {
    return { type: 'ready' };
  }
  if (
    m.type === 'changes' &&
    Number.isInteger(m.epoch) &&
    Number.isInteger(m.prevRevision) &&
    Number.isInteger(m.revision) &&
    Array.isArray(m.replacements) &&
    m.replacements.every(isReplacement) &&
    isSelection(m.selection) &&
    typeof m.composing === 'boolean' &&
    (m.modelRanges === undefined || isRanges(m.modelRanges))
  ) {
    return m as unknown as ChangesMessage;
  }
  if (
    m.type === 'checkpoint' &&
    Number.isInteger(m.epoch) &&
    Number.isInteger(m.revision) &&
    typeof m.text === 'string' &&
    isRanges(m.modelRanges) &&
    isEnds(m.ends) &&
    (m.hold === undefined || Number.isInteger(m.hold)) &&
    isSelection(m.selection) &&
    typeof m.composing === 'boolean'
  ) {
    return m as unknown as CheckpointMessage;
  }
  if (
    m.type === 'selection' &&
    Number.isInteger(m.epoch) &&
    isSelection(m.selection)
  ) {
    return m as unknown as SelectionMessage;
  }
  if (
    m.type === 'composition' &&
    Number.isInteger(m.epoch) &&
    typeof m.composing === 'boolean'
  ) {
    return m as unknown as CompositionMessage;
  }
  return null;
};

/** Author runs as the model-authored ranges the page marks. */
export const modelRangesOf = (runs: readonly AuthorshipRun[]): ModelRange[] => {
  const ranges: ModelRange[] = [];
  let offset = 0;
  for (const run of runs) {
    const end = offset + run.text.length;
    if (run.author === 'model' && end > offset) {
      ranges.push([offset, end]);
    }
    offset = end;
  }
  return ranges;
};

/**
 * The page's replacements as the reducer's: `[from, to)` of the pre-edit
 * document becomes `insert`, every one measured against that same document,
 * which is what `applyReplacements` takes.
 */
export const toReplacements = (
  replacements: readonly Replacement[]
): HostReplacement[] =>
  replacements.map(({ from, to, insert }) => ({
    start: from,
    end: to,
    inserted: insert,
  }));

/**
 * Moves model ranges through one replacement. Text typed inside a model
 * range is the human's, so the range splits around it; deleted text leaves
 * the range; insertion at either edge does not extend it.
 */
export const mapModelRanges = (
  ranges: readonly ModelRange[],
  { from, to, insert }: Replacement
): ModelRange[] => {
  const delta = insert.length - (to - from);
  const mapped: ModelRange[] = [];
  for (const [a, b] of ranges) {
    if (a < from) {
      mapped.push([a, Math.min(b, from)]);
    }
    if (b > to) {
      mapped.push([Math.max(a, to) + delta, b + delta]);
    }
  }
  return mapped;
};

/** Replacements applied last to first, so each one's offsets stay valid. */
export const mapModelRangesThrough = (
  ranges: readonly ModelRange[],
  replacements: readonly Replacement[]
): ModelRange[] =>
  [...replacements]
    .reverse()
    .reduce<ModelRange[]>(
      (current, replacement) => mapModelRanges(current, replacement),
      [...ranges]
    );
