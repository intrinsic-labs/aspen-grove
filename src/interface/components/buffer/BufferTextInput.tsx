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
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';
import type { PreviewEdit, PreviewRun } from './buffer-preview';

export type BufferSelection = { readonly start: number; readonly end: number };

/**
 * What changed between the last string the editor accepted and the string
 * the keyboard produced, as one replacement of `[start, end)`; null when
 * nothing changed.
 *
 * The caret disambiguates repeated text ("aaa" to "aaaa"): the edit is
 * taken to be where the selection was, whether a typed character, a
 * replaced selection, backspace or forward delete. An autocorrect that
 * rewrites more than the selection matches none of those, so it falls back
 * to the longest common prefix and suffix.
 */
export const deriveReplacement = (
  previous: string,
  next: string,
  selection: BufferSelection | null
): PreviewEdit | null => {
  if (previous === next) {
    return null;
  }
  if (selection) {
    const { start, end } = selection;
    if (start <= end && end <= previous.length) {
      const insertedLength = next.length - (previous.length - (end - start));
      if (insertedLength >= 0) {
        const inserted = next.slice(start, start + insertedLength);
        if (
          previous.slice(0, start) + inserted + previous.slice(end) ===
          next
        ) {
          return { start, end, inserted };
        }
      }
      const removed = previous.length - next.length;
      if (start === end && removed > 0) {
        for (const from of [start - removed, start]) {
          if (
            from >= 0 &&
            from + removed <= previous.length &&
            previous.slice(0, from) + previous.slice(from + removed) === next
          ) {
            return { start: from, end: from + removed, inserted: '' };
          }
        }
      }
    }
  }
  let prefix = 0;
  const shortest = Math.min(previous.length, next.length);
  while (prefix < shortest && previous[prefix] === next[prefix]) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < shortest - prefix &&
    previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  return {
    start: prefix,
    end: previous.length - suffix,
    inserted: next.slice(prefix, next.length - suffix),
  };
};

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
  const accepted = useRef(text);
  // The last native string already handled. iOS can deliver the same change
  // twice before React renders (the first character into an empty input
  // does), and applying it twice would double the character.
  const handled = useRef(text);
  if (accepted.current !== text) {
    accepted.current = text;
    handled.current = text;
  }

  const onChange = useCallback(
    (event: NativeSyntheticEvent<TextInputChangeEventData>) => {
      const next = event.nativeEvent.text;
      if (next === handled.current) {
        return;
      }
      handled.current = next;
      const edit = deriveReplacement(accepted.current, next, selection.current);
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
  );
};

const styles = StyleSheet.create({
  input: {
    flex: 1,
    paddingHorizontal: bufferTokens.layout.horizontalMargin,
    paddingBottom: bufferTokens.layout.documentBottomPadding,
  },
});
