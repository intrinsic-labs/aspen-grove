import {
  getHomeDraft,
  setHomeDraft,
  subscribeHomeDraft,
} from './home-draft-store';

describe('home-draft-store', () => {
  afterEach(() => setHomeDraft(''));

  it('keeps what is typed and tells subscribers', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeHomeDraft(listener);
    setHomeDraft('Hello, loom.');
    setHomeDraft('Hello, loom.');
    unsubscribe();
    setHomeDraft('Later');

    expect(getHomeDraft()).toBe('Later');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
