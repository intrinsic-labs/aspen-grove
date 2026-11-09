import { describe, expect, it } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import {
  initialParallelSlotsState,
  parallelSlotsReducer,
  type ParallelSlotsAction,
} from './parallel-slots-state';

const source = '01KSOURCE00000000000000000' as ULID;
const saved = (nodeId: string) => ({
  nodeId: nodeId as ULID,
  finishReason: 'stop' as const,
  modelIdentifier: 'test/model',
  latencyMs: 1,
});

const run = (actions: readonly ParallelSlotsAction[]) =>
  actions.reduce(parallelSlotsReducer, initialParallelSlotsState);

describe('parallelSlotsReducer', () => {
  it('opens one streaming card per slot and shows text as it flushes', () => {
    const state = run([
      { type: 'start', sourceNodeId: source, count: 3 },
      { type: 'text', texts: new Map([[0, 'Once'], [2, 'Long']]) },
    ]);

    expect(state.phase).toBe('running');
    expect(state.slots.map((slot) => [slot.status, slot.text])).toEqual([
      ['streaming', 'Once'],
      ['streaming', ''],
      ['streaming', 'Long'],
    ]);
  });

  it('settles each card from its own outcome, leaving the others streaming', () => {
    const state = run([
      { type: 'start', sourceNodeId: source, count: 4 },
      { type: 'outcome', outcome: { slot: 0, type: 'done', ...saved('n0') } },
      {
        type: 'outcome',
        outcome: { slot: 1, type: 'interrupted', reason: 'network', ...saved('n1') },
      },
      { type: 'outcome', outcome: { slot: 2, type: 'error', message: 'rate limited' } },
    ]);

    expect(state.slots.map((slot) => slot.status)).toEqual([
      'done',
      'interrupted',
      'error',
      'streaming',
    ]);
    expect(state.slots[0].nodeId).toBe('n0');
    expect(state.slots[1]).toMatchObject({ nodeId: 'n1', interruptionReason: 'network' });
    expect(state.slots[2].error).toBe('rate limited');
    expect(state.slots[2].nodeId).toBeUndefined();
  });

  it('shows a stop as stopping, then cancelled with or without a saved node', () => {
    const state = run([
      { type: 'start', sourceNodeId: source, count: 2 },
      { type: 'stopRequested', slot: 0 },
      { type: 'stopRequested', slot: 1 },
    ]);
    expect(state.slots.map((slot) => slot.status)).toEqual(['stopping', 'stopping']);

    const settled = [
      { type: 'outcome', outcome: { slot: 0, type: 'cancelled', saved: saved('n0') } },
      { type: 'outcome', outcome: { slot: 1, type: 'cancelled' } },
    ].reduce(
      (current, action) => parallelSlotsReducer(current, action as ParallelSlotsAction),
      state
    );
    expect(settled.slots.map((slot) => [slot.status, slot.nodeId])).toEqual([
      ['cancelled', 'n0'],
      ['cancelled', undefined],
    ]);
  });

  it('ignores late text for a settled card', () => {
    const state = run([
      { type: 'start', sourceNodeId: source, count: 1 },
      { type: 'text', texts: new Map([[0, 'final']]) },
      { type: 'outcome', outcome: { slot: 0, type: 'error', message: 'x' } },
      { type: 'text', texts: new Map([[0, 'stale']]) },
    ]);

    expect(state.slots[0].text).toBe('final');
  });

  it('marks unsettled cards as failed when the run cannot start', () => {
    const state = run([
      { type: 'start', sourceNodeId: source, count: 2 },
      { type: 'failed', message: 'openrouter API key not found' },
    ]);

    expect(state.phase).toBe('settled');
    expect(state.error).toBe('openrouter API key not found');
    expect(state.slots.every((slot) => slot.status === 'error')).toBe(true);
  });
});
