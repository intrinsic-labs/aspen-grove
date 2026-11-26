import type { WebEditorStyle } from '../../src/interface/components/buffer/android/web-editor-protocol';

/** The page's look as CSS variables on the root; the stylesheet reads them. */
export const applyStyle = (style: WebEditorStyle): void => {
  const root = document.documentElement.style;
  root.setProperty('--font', `${style.fontFamily}, serif`);
  root.setProperty('--size', `${style.fontSize}px`);
  root.setProperty('--leading', `${style.lineHeight}px`);
  root.setProperty('--pad-top', `${style.paddingTop}px`);
  root.setProperty('--pad-x', `${style.paddingHorizontal}px`);
  root.setProperty('--pad-bottom', `${style.paddingBottom}px`);
  root.setProperty('--human', style.humanColor);
  root.setProperty('--model', style.modelColor);
  root.setProperty('--placeholder', style.placeholderColor);
  root.setProperty('--background', style.backgroundColor);
};
