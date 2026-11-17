import { createContext, useContext } from 'react';

/** The tree screen's chrome a lifted message preview must stay clear of. */
export type PreviewArea = {
  /** The header's height from the window's top, status bar included. */
  readonly headerHeight: number;
  /** The bottom safe area. */
  readonly bottomInset: number;
};

export const PreviewAreaContext = createContext<PreviewArea | null>(null);

/** The enclosing message list's preview area, or null outside one. */
export const usePreviewArea = (): PreviewArea | null =>
  useContext(PreviewAreaContext);
