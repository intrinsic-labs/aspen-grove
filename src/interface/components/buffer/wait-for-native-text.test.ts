import { waitForNativeText } from './wait-for-native-text';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const start = (initial: string) => {
  let applied = initial;
  const listener = { current: null as (() => void) | null };
  const done = jest.fn();
  const result = waitForNativeText(
    Promise.resolve('final'),
    () => applied,
    listener
  ).then(done);
  return {
    result,
    done,
    change(text: string) {
      applied = text;
      listener.current?.();
    },
  };
};

test('equal at once acknowledges without a frame', async () => {
  const wait = start('final');
  await jest.advanceTimersByTimeAsync(0);
  expect(wait.done).toHaveBeenCalled();
});

test('one late native change acknowledges as soon as JS applies it', async () => {
  const wait = start('before');
  await jest.advanceTimersByTimeAsync(100);
  expect(wait.done).not.toHaveBeenCalled();
  wait.change('final');
  await wait.result;
  expect(wait.done).toHaveBeenCalled();
});

test('a native snapshot that never matches times out', async () => {
  const wait = start('before');
  const result = wait.result.then(
    () => 'resolved',
    (error: Error) => error.message
  );
  await jest.advanceTimersByTimeAsync(1500);
  expect(await result).toBe(
    'The editor timed out while confirming your last edit. Try again.'
  );
});
