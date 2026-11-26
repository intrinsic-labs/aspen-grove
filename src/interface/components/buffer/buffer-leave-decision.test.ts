import { afterSave, decideLeave } from './buffer-leave-decision';

const state = (over: Partial<Parameters<typeof decideLeave>[0]> = {}) => ({
  dirty: false,
  saving: false,
  ...over,
});

describe('decideLeave', () => {
  test('a clean document never intercepts', () => {
    expect(decideLeave(state())).toBe('leave');
  });
  test('a dirty document is held for a save', () => {
    expect(decideLeave(state({ dirty: true }))).toBe('save');
  });
  test('a second attempt while a save is pending is held, not saved again', () => {
    expect(decideLeave(state({ dirty: true, saving: true }))).toBe('hold');
  });
});

describe('afterSave', () => {
  test('a saved document leaves', () => expect(afterSave(true)).toBe('leave'));
  test('a failed save stays on the screen', () =>
    expect(afterSave(false)).toBe('stay'));
});
