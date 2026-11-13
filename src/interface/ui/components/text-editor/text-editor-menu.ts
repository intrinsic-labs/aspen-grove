import type { NativeMenuSections } from '../native-menu';

export type TextEditorMenuAction = 'copy' | 'clear';

/** The editor's `ellipsis.circle` menu (FullScreenTextEditor.swift:31-41). */
export const TEXT_EDITOR_MENU: NativeMenuSections<TextEditorMenuAction> = [
  [
    { action: 'copy', title: 'Copy text', systemIcon: 'doc.on.doc' },
    { action: 'clear', title: 'Clear text', systemIcon: 'trash' },
  ],
];
