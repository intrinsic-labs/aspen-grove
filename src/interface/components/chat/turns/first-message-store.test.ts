import {
  hasFirstMessage,
  setFirstMessage,
  takeFirstMessage,
} from './first-message-store';

describe('first-message-store', () => {
  it('hands a tree its first message once', () => {
    setFirstMessage('tree-a', 'Write me a story');
    expect(hasFirstMessage('tree-a')).toBe(true);
    expect(takeFirstMessage('tree-a')).toBe('Write me a story');
    expect(hasFirstMessage('tree-a')).toBe(false);
    expect(takeFirstMessage('tree-a')).toBeUndefined();
  });

  it('keeps trees apart', () => {
    setFirstMessage('tree-b', 'one');
    expect(takeFirstMessage('tree-c')).toBeUndefined();
    expect(takeFirstMessage('tree-b')).toBe('one');
  });
});
