import type { BufferChoiceSet } from '@application/services/buffer/buffer-choices';
import { id } from '@application/services/buffer/buffer-graph-fixtures';
import { pillChoice } from './buffer-choice-pill';

const set = (count: number, active = 0): BufferChoiceSet => ({
  entries: Array.from({ length: count }, (_, i) => ({
    nodeId: id(`n${i}`),
    action: { kind: 'version', position: 1, nodeId: id(`n${i}`) },
  })),
  active,
});

test('branches show when a position has more than one child family', () => {
  const pill = pillChoice({
    position: 1,
    branches: set(2, 1),
    versions: set(3),
  });
  expect(pill?.kind).toBe('branch');
  expect(pill?.label).toBe('Branch 2 of 2');
});

test('versions show when there is a single branch', () => {
  const pill = pillChoice({
    position: 1,
    branches: set(1),
    versions: set(3, 2),
  });
  expect(pill).toMatchObject({ kind: 'version', label: 'Version 3 of 3' });
});

test('nothing shows when there is nothing to switch between', () => {
  expect(
    pillChoice({ position: 0, branches: set(0), versions: set(1) })
  ).toBeUndefined();
  expect(pillChoice(undefined)).toBeUndefined();
});
