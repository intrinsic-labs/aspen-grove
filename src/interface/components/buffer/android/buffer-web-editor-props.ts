import type { TextStyle } from 'react-native';
import type { PreviewEdit, PreviewRun } from '../buffer-preview';

export type BufferWebEditorProps = {
  /** Identifies a document load: the editor reloads when it changes. */
  readonly epoch: number;
  /** The document as of `epoch`; read on load only, never per keystroke. */
  readonly text: string;
  readonly runs: readonly PreviewRun[];
  readonly textStyle: TextStyle;
  readonly headerHeight: number;
  readonly topGap: number;
  readonly placeholder?: string;
  /** Sequential edits, in the document after the earlier ones. */
  readonly onReplace: (edit: PreviewEdit) => void;
};
