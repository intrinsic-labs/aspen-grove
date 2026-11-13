/**
 * An alert that asks for one line of text, as SwiftUI's
 * `.alert(title) { TextField; Button("Save"); Button("Cancel") }`.
 */
export type TextPromptRequest = {
  readonly title: string;
  readonly message?: string;
  /** The field's starting text. */
  readonly initialValue: string;
  /** Shown while the field is empty (Android; iOS's prompt has none). */
  readonly placeholder?: string;
};

/** The text on Save, or null on Cancel. */
export type TextPromptResult = string | null;

/** A prompt waiting on the Android stand-in, and how to answer it. */
export type PendingTextPrompt = {
  readonly request: TextPromptRequest;
  readonly resolve: (result: TextPromptResult) => void;
};
