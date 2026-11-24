import { createChangeTracker } from './native-change-tracker';

describe('createChangeTracker.sync', () => {
  it('reports nothing for the string it already holds', () => {
    const tracker = createChangeTracker('abc');
    expect(tracker.sync('abc')).toBeNull();
  });

  it('reports nothing when a render echoes a change it issued', () => {
    const tracker = createChangeTracker('');
    tracker.receive('a', { start: 1, end: 1 });
    expect(tracker.sync('a')).toBeNull();
  });

  it('returns the replaced text when the document changes from outside', () => {
    const tracker = createChangeTracker('');
    expect(tracker.sync('Paragraph 001')).toBe('');
    expect(tracker.sync('Paragraph 001')).toBeNull();
    expect(tracker.sync('Other')).toBe('Paragraph 001');
  });

  it('measures the next edit from the loaded document', () => {
    const tracker = createChangeTracker('');
    tracker.sync('hello');
    expect(tracker.receive('hello!', { start: 6, end: 6 })).toEqual({
      start: 5,
      end: 5,
      inserted: '!',
    });
  });
});
