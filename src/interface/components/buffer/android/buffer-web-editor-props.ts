import type { TextStyle } from 'react-native';
import type { PreviewEdit, PreviewRun } from '../buffer-preview';
import type { ModelRange } from './web-editor-protocol';
import type { CompositionControl } from '../composition-barrier';

/** What the host applies from the page; one stable object per screen. */
export type WebEditorSink = {
  /** Sequential edits, in the document after the earlier ones. */
  readonly onReplace: (edit: PreviewEdit) => void;
  /** Undo/redo restored these exact model ranges. */
  readonly onModelRanges: (ranges: readonly ModelRange[]) => void;
  /** Resume from the page's whole state after a revision gap. */
  readonly onAdopt: (
    text: string,
    ranges: readonly ModelRange[],
    seam: number
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
  readonly runs: readonly PreviewRun[];
  /** Where the shared prefix ends and the current ending begins. */
  readonly seam: number;
  /** Where the editor registers how to end a composition (stable). */
  readonly composition: CompositionControl;
  readonly textStyle: TextStyle;
  readonly headerHeight: number;
  readonly topGap: number;
  readonly placeholder?: string;
  readonly sink: WebEditorSink;
};
