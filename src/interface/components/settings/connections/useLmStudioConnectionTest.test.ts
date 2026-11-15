import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@interface/test-support/render-hook';
import {
  type LmStudioConnectionTarget,
  useLmStudioConnectionTest,
} from './useLmStudioConnectionTest';

const MOCK = { endpoint: 'http://localhost:1235', token: '' };

const setup = (
  connect: (target: LmStudioConnectionTarget) => Promise<void> = () =>
    Promise.resolve()
) =>
  renderHook(
    (target: LmStudioConnectionTarget) =>
      useLmStudioConnectionTest(target, connect, () => 'Not reachable'),
    MOCK
  );

describe('useLmStudioConnectionTest', () => {
  it('starts untested and reads Connected after a successful test', async () => {
    const { result } = setup();
    expect(result.current.status).toBe('idle');
    await act(() => result.current.test());
    expect(result.current.status).toBe('connected');
  });

  it('goes back to untested when the server address is edited', async () => {
    const { result, rerender } = setup();
    await act(() => result.current.test());
    await rerender({ ...MOCK, endpoint: 'http://localhost:1236' });
    expect(result.current.status).toBe('idle');
  });

  it('goes back to untested when the token is edited', async () => {
    const { result, rerender } = setup();
    await act(() => result.current.test());
    await rerender({ ...MOCK, token: 'secret' });
    expect(result.current.status).toBe('idle');
  });

  it('clears a failure and its message when the address is edited', async () => {
    const { result, rerender } = setup(() => Promise.reject(new Error('x')));
    await act(() => result.current.test());
    expect(result.current.status).toBe('disconnected');
    expect(result.current.error).toBe('Not reachable');
    await rerender({ ...MOCK, endpoint: 'http://localhost:1236' });
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('tests the trimmed address, so surrounding spaces are not an edit', async () => {
    const connect = jest.fn(() => Promise.resolve());
    const { result, rerender } = setup(connect);
    await act(() => result.current.test());
    expect(connect).toHaveBeenCalledWith(MOCK);
    await rerender({ ...MOCK, endpoint: ` ${MOCK.endpoint} ` });
    expect(result.current.status).toBe('connected');
  });

  it('drops the answer to a test of an address edited while it ran', async () => {
    let answer: () => void = () => undefined;
    const { result, rerender } = setup(
      () =>
        new Promise<void>((resolve) => {
          answer = resolve;
        })
    );
    await act(() => {
      void result.current.test();
    });
    expect(result.current.status).toBe('checking');
    await rerender({ ...MOCK, endpoint: 'http://localhost:1236' });
    await act(() => answer());
    expect(result.current.status).toBe('idle');
  });
});
