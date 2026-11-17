import {
  hasFirstMessage,
  setFirstMessage,
  takeFirstMessage,
} from './first-message-store';

describe('first-message-store', () => {
  it('hands a tree its first message once, to send', () => {
    setFirstMessage('tree-a', 'Write me a story');
    expect(hasFirstMessage('tree-a')).toBe(true);
    expect(takeFirstMessage('tree-a')).toEqual({
      text: 'Write me a story',
      mode: 'send',
    });
    expect(hasFirstMessage('tree-a')).toBe(false);
    expect(takeFirstMessage('tree-a')).toBeUndefined();
  });

  it('keeps trees apart', () => {
    setFirstMessage('tree-b', 'one');
    expect(takeFirstMessage('tree-c')).toBeUndefined();
    expect(takeFirstMessage('tree-b')?.text).toBe('one');
  });

  it('carries a message to leave in the composer', () => {
    setFirstMessage('tree-d', 'Typed before setup', 'draft');
    expect(takeFirstMessage('tree-d')).toEqual({
      text: 'Typed before setup',
      mode: 'draft',
    });
  });
});
