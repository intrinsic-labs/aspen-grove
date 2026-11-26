import type { BufferWebEditorProps } from './buffer-web-editor-props';

/**
 * The CodeMirror editor exists on Android only (a developer-preview speed
 * experiment); iOS keeps BufferTextInput. This is the platform fallback so
 * the editor page is never bundled for iOS. See BufferWebEditor.android.tsx.
 */
export const BufferWebEditor = (_props: BufferWebEditorProps) => null;
