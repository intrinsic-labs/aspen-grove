import { settleComposition } from './settle-composition';

test('a composition open at settle time is committed before the editor turns read-only', async () => {
  let composing = true;
  let locked = false;
  let pending = false;
  let text = 'draft';
  const settled = await settleComposition({
    current: () => true,
    composing: () => composing,
    end: () => {
      setTimeout(() => {
        composing = false;
        pending = true;
      }, 5);
    },
    flush: async () => {
      if (pending && !locked) text = 'confirmed';
      pending = false;
    },
    lock: async () => {
      locked = true;
    },
  });
  expect({ settled, locked, text }).toEqual({
    settled: true,
    locked: true,
    text: 'confirmed',
  });
});
