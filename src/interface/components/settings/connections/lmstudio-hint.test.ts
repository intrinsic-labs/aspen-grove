import { showsLmStudioHint } from './lmstudio-hint';

describe('showsLmStudioHint', () => {
  it('shows before a connection has been tested', () => {
    expect(showsLmStudioHint('idle')).toBe(true);
  });

  it('shows while a test is running', () => {
    expect(showsLmStudioHint('checking')).toBe(true);
  });

  it('shows when the connection fails', () => {
    expect(showsLmStudioHint('disconnected')).toBe(true);
  });

  it('hides once the connection works', () => {
    expect(showsLmStudioHint('connected')).toBe(false);
  });
});
