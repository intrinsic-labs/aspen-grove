import type { PreviewEdit, PreviewRun } from '../buffer-preview';

/**
 * The messages between the React Native host and the CodeMirror page, and the
 * pure range arithmetic both sides share. Offsets are UTF-16 code units, the
 * unit CodeMirror counts in and native selection reports. The whole text
 * crosses the bridge once per load (`load`); typing sends only replacements.
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
  readonly style: WebEditorStyle;
};

export type HostMessage = LoadMessage;

/** `[from, to)` of the pre-edit document becomes `insert`. */
export type Replacement = {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
};

export type EditorMessage =
  | { readonly type: 'ready' }
  | {
      readonly type: 'changes';
      readonly epoch: number;
      /** Counts changes since the load, so a gap would be visible. */
      readonly revision: number;
      /** In document order, all against the pre-edit document. */
      readonly replacements: readonly Replacement[];
      readonly selection: { readonly anchor: number; readonly head: number };
      readonly composing: boolean;
    };

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

/** The page's message, or null for anything malformed (never trusted). */
export const parseEditorMessage = (raw: string): EditorMessage | null => {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const message = data as Partial<EditorMessage> | null;
  if (message?.type === 'ready') {
    return { type: 'ready' };
  }
  if (
    message?.type === 'changes' &&
    Number.isInteger(message.epoch) &&
    Number.isInteger(message.revision) &&
    Array.isArray(message.replacements) &&
    message.replacements.every(isReplacement) &&
    message.selection !== undefined &&
    Number.isInteger(message.selection.anchor) &&
    Number.isInteger(message.selection.head)
  ) {
    return message as EditorMessage;
  }
  return null;
};

/** Author runs as the model-authored ranges the page marks. */
export const modelRangesOf = (runs: readonly PreviewRun[]): ModelRange[] => {
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
 * Replacements against one pre-edit document as sequential edits: each
 * `start`/`end` is in the document after the earlier edits were applied,
 * which is what `applyPreviewEdit` expects.
 */
export const replacementsToEdits = (
  replacements: readonly Replacement[]
): PreviewEdit[] => {
  let shift = 0;
  return replacements.map(({ from, to, insert }) => {
    const edit = { start: from + shift, end: to + shift, inserted: insert };
    shift += insert.length - (to - from);
    return edit;
  });
};

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
