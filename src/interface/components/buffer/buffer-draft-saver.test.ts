import { createDraftSaver } from './buffer-draft-saver';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('typing coalesces into one save after the pause', async () => {
  const save = jest.fn(async () => {});
  const saver = createDraftSaver({ save });
  saver.schedule();
  jest.advanceTimersByTime(400);
  saver.schedule();
  jest.advanceTimersByTime(400);
  expect(save).not.toHaveBeenCalled();
  jest.advanceTimersByTime(100);
  expect(save).toHaveBeenCalledTimes(1);
});

test('flush saves a pending draft at once and only once', async () => {
  const save = jest.fn(async () => {});
  const saver = createDraftSaver({ save });
  saver.schedule();
  await saver.flush();
  await saver.flush();
  jest.advanceTimersByTime(1000);
  expect(save).toHaveBeenCalledTimes(1);
});

test('a failing save does not escape and cancel drops the pending one', async () => {
  const save = jest.fn(async () => {
    throw new Error('disk full');
  });
  const saver = createDraftSaver({ save });
  saver.schedule();
  await expect(saver.flush()).resolves.toBeUndefined();
  saver.schedule();
  saver.cancel();
  jest.advanceTimersByTime(1000);
  expect(save).toHaveBeenCalledTimes(1);
});
