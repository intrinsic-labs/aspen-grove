import { describe, expect, it } from '@jest/globals';
import { loomUiTokens } from '../../ui/value-objects/loom-ui-tokens';
import { nextFrameIndex, thinkingText } from './thinking-indicator-frames';

const { frames } = loomUiTokens.thinkingIndicator;

describe('thinking indicator frames', () => {
  it('has fixed-width frames with a single 0', () => {
    for (const frame of frames) {
      expect([...frame]).toHaveLength(5);
      expect(frame.split('0')).toHaveLength(2);
    }
  });

  it('bounces the 0 to the far end and back', () => {
    const positions = frames.map((frame) => frame.indexOf('0'));
    expect(positions).toEqual([1, 2, 3, 4, 3, 2, 1, 0]);
  });

  it('steps forward and wraps from the last frame to the first', () => {
    expect(nextFrameIndex(0)).toBe(1);
    expect(nextFrameIndex(frames.length - 2)).toBe(frames.length - 1);
    expect(nextFrameIndex(frames.length - 1)).toBe(0);
  });

  it('starts at 0•••• before the first tick, like the reference', () => {
    expect(thinkingText(null, false)).toBe('0••••');
    expect(thinkingText(nextFrameIndex(0), false)).toBe('••0••');
  });

  it('is static with reduce motion on', () => {
    expect(thinkingText(null, true)).toBe('•••••');
    expect(thinkingText(3, true)).toBe('•••••');
  });
});
