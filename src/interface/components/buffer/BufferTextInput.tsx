import { useCallback, useRef } from 'react';
import {
  type NativeSyntheticEvent,
  StyleSheet,
  Text,
  type TextInputChangeEventData,
  type TextInputSelectionChangeEventData,
  type TextStyle,
} from 'react-native';
import { AppTextInput } from '@/interface/ui/components/AppTextInput';
import { KeyboardDoneBar } from '@/interface/ui/components/KeyboardDoneBar';
import { useKeyboardAccessoryId } from '@/interface/ui/components/useKeyboardAccessoryId';
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';
import type { PreviewEdit, PreviewRun } from './buffer-preview';
import type { BufferSelection } from './derive-replacement';
import { createChangeTracker } from './native-change-tracker';

type BufferTextInputProps = {
  /** The accepted document; `runs` concatenate to exactly this string. */
  readonly text: string;
  readonly runs: readonly PreviewRun[];
  readonly editable: boolean;
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
  textStyle,
  topInset,
  placeholder,
  onReplace,
  onSelectionChange,
}: BufferTextInputProps) => {
  const selection = useRef<BufferSelection | null>(null);
  // A multiline input has no `keyboardDismissMode` (that is a ScrollView prop),
  // so the keyboard goes away through the app's Done bar, as in its other
  // full-screen editor: iOS only, and only while the keyboard is up. Android
  // closes it with the back key.
  const accessoryId = useKeyboardAccessoryId('buffer-document-keyboard');
  const tracker = useRef(createChangeTracker(text));
  tracker.current.sync(text);

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
      onSelectionChange?.(event.nativeEvent.selection);
    },
    [onSelectionChange]
  );

  return (
    <>
      <AppTextInput
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
        inputAccessoryViewID={accessoryId}
        style={[
          styles.input,
          textStyle,
          { color: bufferTokens.colors.humanText, paddingTop: topInset },
        ]}
      >
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
      </AppTextInput>
      <KeyboardDoneBar nativeID={accessoryId} />
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    flex: 1,
    paddingHorizontal: bufferTokens.layout.horizontalMargin,
    paddingBottom: bufferTokens.layout.documentBottomPadding,
  },
});
