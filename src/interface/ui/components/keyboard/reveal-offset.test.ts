import { describe, expect, it } from '@jest/globals';
import { offsetToReveal } from './reveal-offset';

describe('offsetToReveal', () => {
  it('scrolls a field under the keyboard up to the gap above it', () => {
    // The agent editor's Max Tokens row under the number pad.
    expect(
      offsetToReveal({
        fieldBottom: 660,
        keyboardTop: 566,
        gap: 24,
        scrollOffset: 0,
      })
    ).toBe(118);
  });

  it('counts from where the view is already scrolled', () => {
    expect(
      offsetToReveal({
        fieldBottom: 576,
        keyboardTop: 566,
        gap: 24,
        scrollOffset: 78,
      })
    ).toBe(112);
  });

  it('leaves a field already clear of the keyboard', () => {
    expect(
      offsetToReveal({
        fieldBottom: 400,
        keyboardTop: 566,
        gap: 24,
        scrollOffset: 30,
      })
    ).toBeNull();
  });
});
