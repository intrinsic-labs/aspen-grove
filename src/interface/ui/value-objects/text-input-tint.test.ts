import { loomUiTokens } from './loom-ui-tokens';
import { textInputTint } from './text-input-tint';

const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');

describe('textInputTint', () => {
  it('tints the caret with the app accent, as Latent Spaces does', () => {
    expect(textInputTint.caret).toBe(loomUiTokens.colors.accentColor);
  });

  it('highlights Android selections in a translucent accent', () => {
    expect(textInputTint.androidHighlight).toBe(
      `rgba(${rgb(loomUiTokens.colors.accentColor)}, 0.4)`
    );
  });
});
