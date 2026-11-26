import { Platform, type TextStyle } from 'react-native';
import { BufferWebEditor } from './android/BufferWebEditor';
import { BufferTextInput, type BufferRenderVariant } from './BufferTextInput';
import type { WebEditorSink } from './android/buffer-web-editor-props';
import type { PreviewEdit, PreviewRun } from './buffer-preview';

/** Which editor draws the document. `web` exists on Android only. */
export type BufferEngine = 'native' | 'web';

/** The engine selector is shown where there is a second engine to pick. */
export const hasWebEngine = Platform.OS === 'android';

type BufferEditorSurfaceProps = {
  readonly engine: BufferEngine;
  readonly variant: BufferRenderVariant;
  /** Counts document loads; the web editor reloads when it changes. */
  readonly epoch: number;
  /** Counts fixture loads only (not sibling switches), for the native input. */
  readonly fixtureEpoch: number;
  readonly text: string;
  readonly runs: readonly PreviewRun[];
  readonly textStyle: TextStyle;
  readonly headerHeight: number;
  readonly topGap: number;
  readonly onReplace: (edit: PreviewEdit) => void;
  /** What the web editor applies from the page; stable across renders. */
  readonly sink: WebEditorSink;
};

const PLACEHOLDER = 'Start writing';

/** The writing surface: the native multiline input, or CodeMirror on Android. */
export const BufferEditorSurface = ({
  engine,
  variant,
  epoch,
  fixtureEpoch,
  text,
  runs,
  textStyle,
  headerHeight,
  topGap,
  onReplace,
  sink,
}: BufferEditorSurfaceProps) =>
  hasWebEngine && engine === 'web' ? (
    <BufferWebEditor
      epoch={epoch}
      text={text}
      runs={runs}
      textStyle={textStyle}
      headerHeight={headerHeight}
      topGap={topGap}
      placeholder={PLACEHOLDER}
      sink={sink}
    />
  ) : (
    <BufferTextInput
      text={text}
      runs={runs}
      editable
      variant={variant}
      fixtureEpoch={fixtureEpoch}
      textStyle={textStyle}
      headerHeight={headerHeight}
      topGap={topGap}
      placeholder={PLACEHOLDER}
      onReplace={onReplace}
    />
  );
