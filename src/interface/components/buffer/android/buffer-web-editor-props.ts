import type { TextStyle } from 'react-native';
import type { Replacement } from '@application/services/buffer/apply-replacement';
import type { AuthorshipRun } from '@application/services/buffer/authorship-runs';
import type { OwnerLayout } from '@application/services/buffer/owner-layout';
import type { ModelRange } from './web-editor-protocol';
import type { CompositionControl } from '../composition-barrier';

/** What the host applies from the page; one stable object per screen. */
export type WebEditorSink = {
  /**
   * One accepted transaction: replacements measured against the document
   * before it, applied in one call. `modelRanges` come with undo and redo and
   * are the exact colors to restore.
   */
  readonly onChanges: (
    replacements: readonly Replacement[],
    caret: number,
    modelRanges?: readonly ModelRange[]
  ) => void;
  /** Resume from the page's whole state after a revision gap. */
  readonly onAdopt: (
    text: string,
    ranges: readonly ModelRange[],
    layout: OwnerLayout,
    caret: number
  ) => void;
  /** The page's composing state changed without an edit (a composition ended). */
  readonly onComposition: (composing: boolean) => void;
  /** An edit or checkpoint was applied; for measurement receipts. */
  readonly onApplied: (receipt: AppliedReceipt) => void;
};

export type AppliedReceipt = {
  readonly revision: number;
  /** The caret (selection head) after the edit. */
  readonly head: number;
  readonly composing: boolean;
};


export type BufferWebEditorProps = {
  /** Identifies a document load: the editor reloads when it changes. */
  readonly epoch: number;
  /** The document as of `epoch`; read on load only, never per keystroke. */
  readonly text: string;
  readonly runs: readonly AuthorshipRun[];
  /** Where each owner ends: prefix, current ending, tail. */
  readonly ends: readonly number[];
  /** Where the editor registers how to end a composition (stable). */
  readonly composition: CompositionControl;
  readonly textStyle: TextStyle;
  readonly headerHeight: number;
  readonly topGap: number;
  readonly placeholder?: string;
  readonly sink: WebEditorSink;
};
