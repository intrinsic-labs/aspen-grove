import { useCallback, useRef, useState } from 'react';
import {
  type NativeSyntheticEvent,
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
  readonly textStyle: TextStyle;
  readonly topInset: number;
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
  textStyle,
  topInset,
  placeholder,
  onReplace,
  onSelectionChange,
}: BufferTextInputProps) => {
  const selection = useRef<BufferSelection | null>(null);
  const tracker = useRef(createChangeTracker(text));
  // A document loaded wholesale (a fixture, not a sibling switch) gets a fresh
  // native input with its caret pinned to the start until the user moves it:
  // Android otherwise keeps the end of the new text in view.
  const [generation, setGeneration] = useState(0);
  const [atStart, setAtStart] = useState(false);
  const replaced = tracker.current.sync(text);
  if (replaced !== null && startsNewDocument(replaced, text)) {
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
        { color: bufferTokens.colors.humanText, paddingTop: topInset },
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

const START = { start: 0, end: 0 } as const;

/** A sibling switch keeps the shared opening; a fixture load shares nothing. */
const startsNewDocument = (before: string, after: string) =>
  after.length > 0 && before.charAt(0) !== after.charAt(0);

const styles = StyleSheet.create({
  input: {
    flex: 1,
    paddingHorizontal: bufferTokens.layout.horizontalMargin,
    paddingBottom: bufferTokens.layout.documentBottomPadding,
  },
});
