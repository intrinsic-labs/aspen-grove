import { useCallback, useRef, useState } from 'react';
import {
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  type TextInputChangeEventData,
  type TextInputSelectionChangeEventData,
  type TextStyle,
} from 'react-native';
import { AppTextInput } from '@/interface/ui/components/AppTextInput';
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';
import type { PreviewEdit, PreviewRun } from './buffer-preview';
import type { BufferSelection } from './derive-replacement';
import type { CompositionControl } from './composition-barrier';
import { useNativeComposition } from './ios/useNativeComposition';
import { createChangeTracker } from './native-change-tracker';

/**
 * How the document is handed to the native input. `spans` is the product:
 * one colored child per author run. `single` and `plain` are developer-preview
 * measurement variants: the whole text in one uncolored child, and as a bare
 * string, to price the spans against the text's length.
 */
export type BufferRenderVariant = 'spans' | 'single' | 'plain';

type BufferTextInputProps = {
  /** The accepted document; `runs` concatenate to exactly this string. */
  readonly text: string;
  readonly runs: readonly PreviewRun[];
  readonly editable: boolean;
  readonly variant?: BufferRenderVariant;
  /** Counts fixture loads; a new one starts a fresh input at the top. */
  readonly fixtureEpoch?: number;
  /** Where the input registers how to end an IME composition (stable). */
  readonly composition: CompositionControl;
  /** The input's IME composing state (iOS marked text). */
  readonly onComposition: (composing: boolean) => void;
  readonly textStyle: TextStyle;
  /** The translucent header's height: the document starts below it. */
  readonly headerHeight: number;
  /** The gap between the header and the first line. */
  readonly topGap: number;
  readonly placeholder?: string;
  readonly onReplace: (edit: PreviewEdit) => void;
  readonly onSelectionChange?: (selection: BufferSelection) => void;
};

/**
 * The writing surface: one natively scrolling multiline input whose value
 * is its children, runs of colored text. The keyboard edits the native
 * string; each change is reported as a replacement against the last accepted
 * string, and the caller's new `runs` come back as the children. The
 * selection belongs to the native view and is never fed back.
 */
export const BufferTextInput = ({
  text,
  runs,
  editable,
  variant = 'spans',
  fixtureEpoch = 0,
  composition,
  onComposition,
  textStyle,
  headerHeight,
  topGap,
  placeholder,
  onReplace,
  onSelectionChange,
}: BufferTextInputProps) => {
  const selection = useRef<BufferSelection | null>(null);
  useNativeComposition(composition, onComposition);
  const tracker = useRef(createChangeTracker(text));
  // A document loaded wholesale (a fixture, not a sibling switch) gets a fresh
  // native input with its caret pinned to the start until the user moves it:
  // Android otherwise keeps the end of the new text in view. The screen says
  // so with `fixtureEpoch`; the text is never guessed at.
  const [generation, setGeneration] = useState(0);
  const [atStart, setAtStart] = useState(false);
  const [seenFixture, setSeenFixture] = useState(fixtureEpoch);
  tracker.current.sync(text);
  if (seenFixture !== fixtureEpoch) {
    setSeenFixture(fixtureEpoch);
    setGeneration(generation + 1);
    setAtStart(true);
  }

  const onChange = useCallback(
    (event: NativeSyntheticEvent<TextInputChangeEventData>) => {
      const edit = tracker.current.receive(
        event.nativeEvent.text,
        selection.current
      );
      if (edit) {
        onReplace(edit);
      }
    },
    [onReplace]
  );

  const onSelection = useCallback(
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      selection.current = event.nativeEvent.selection;
      const { start, end } = event.nativeEvent.selection;
      if (atStart && (start !== 0 || end !== 0)) {
        setAtStart(false);
      }
      onSelectionChange?.(event.nativeEvent.selection);
    },
    [atStart, onSelectionChange]
  );

  return (
    <AppTextInput
      key={generation}
      selection={atStart ? START : undefined}
      testID="buffer-document"
      multiline
      scrollEnabled
      editable={editable}
      autoCorrect
      textAlignVertical="top"
      placeholder={placeholder}
      placeholderTextColor={bufferTokens.colors.placeholder}
      onChange={onChange}
      onSelectionChange={onSelection}
      style={[
        styles.input,
        textStyle,
        { color: bufferTokens.colors.humanText },
        topLayout(headerHeight, topGap),
      ]}
    >
      {variant === 'plain' ? text : null}
      {variant === 'single' ? <Text key="single">{text}</Text> : null}
      {variant === 'spans' ? <AuthorRuns runs={runs} /> : null}
    </AppTextInput>
  );
};

const AuthorRuns = ({ runs }: { readonly runs: readonly PreviewRun[] }) => (
  <>
    {runs.length === 0 ? <Text key="empty">{''}</Text> : null}
    {runs.map((run, index) => (
      <Text
        key={index}
        style={
          run.author === 'model'
            ? { color: bufferTokens.colors.modelText }
            : undefined
        }
      >
        {run.text}
      </Text>
    ))}
  </>
);

/**
 * Where the first line starts. On iOS the native text view is a scroll view
 * and UIKit insets it by the header whenever its frame overlaps the bar and the
 * text is taller than the view: padding for the header too would leave a
 * header-high blank gap above a long document (and a short one would jump when
 * it grew past a screen). So there the view's frame starts below the header and
 * only the gap is padding, which leaves UIKit no inset to add. Android pads.
 */
const topLayout = (headerHeight: number, topGap: number): TextStyle =>
  Platform.OS === 'ios'
    ? { marginTop: headerHeight, paddingTop: topGap }
    : { paddingTop: headerHeight + topGap };

const START = { start: 0, end: 0 } as const;

const styles = StyleSheet.create({
  input: {
    flex: 1,
    paddingHorizontal: bufferTokens.layout.horizontalMargin,
    paddingBottom: bufferTokens.layout.documentBottomPadding,
  },
});
