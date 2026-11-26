import { Platform, type TextStyle } from 'react-native';
import { BufferWebEditor } from './android/BufferWebEditor';
import { BufferTextInput, type BufferRenderVariant } from './BufferTextInput';
import type { WebEditorSink } from './android/buffer-web-editor-props';
import type { CompositionControl } from './composition-barrier';
import type { Replacement } from '@application/services/buffer/apply-replacement';
import type { AuthorshipRun } from '@application/services/buffer/authorship-runs';
import type { BufferSelection } from './derive-replacement';

/** Which editor draws the document. `web` exists on Android only. */
export type BufferEngine = 'native' | 'web';

/** The engine selector is shown where there is a second engine to pick. */
export const hasWebEngine = Platform.OS === 'android';

type BufferEditorSurfaceProps = {
  readonly engine: BufferEngine;
  readonly readOnly: boolean;
  readonly variant: BufferRenderVariant;
  /** Counts document loads; the web editor reloads when it changes. */
  readonly epoch: number;
  /** Counts fixture loads only (not sibling switches), for the native input. */
  readonly fixtureEpoch: number;
  readonly text: string;
  readonly runs: readonly AuthorshipRun[];
  /** Where each owner ends: prefix, current ending, tail. */
  readonly ends: readonly number[];
  readonly composition: CompositionControl;
  /** The native input's IME composing state, for the composition barrier. */
  readonly onComposition: (composing: boolean) => void;
  readonly textStyle: TextStyle;
  readonly headerHeight: number;
  readonly topGap: number;
  readonly onReplace: (edit: Replacement) => void;
  /** The native input's selection changes, which move the caret. */
  readonly onSelection: (selection: BufferSelection) => void;
  /** What the web editor applies from the page; stable across renders. */
  readonly sink: WebEditorSink;
};

const PLACEHOLDER = 'Start writing';

/** The writing surface: the native multiline input, or CodeMirror on Android. */
export const BufferEditorSurface = ({
  engine,
  readOnly,
  variant,
  epoch,
  fixtureEpoch,
  text,
  runs,
  ends,
  composition,
  onComposition,
  textStyle,
  headerHeight,
  topGap,
  onReplace,
  onSelection,
  sink,
}: BufferEditorSurfaceProps) =>
  hasWebEngine && engine === 'web' ? (
    <BufferWebEditor
      epoch={epoch}
      readOnly={readOnly}
      text={text}
      runs={runs}
      ends={ends}
      composition={composition}
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
      editable={!readOnly}
      variant={variant}
      fixtureEpoch={fixtureEpoch}
      composition={composition}
      onComposition={onComposition}
      textStyle={textStyle}
      headerHeight={headerHeight}
      topGap={topGap}
      placeholder={PLACEHOLDER}
      onReplace={onReplace}
      onSelectionChange={onSelection}
    />
  );
