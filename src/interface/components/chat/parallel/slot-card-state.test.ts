import { describe, expect, it } from '@jest/globals';
import type { ULID } from '@domain/value-objects';
import type { ParallelSlotView } from './parallel-slots-state';
import { toSlotCardState } from './slot-card-state';

const view = (extra: Partial<ParallelSlotView>): ParallelSlotView => ({
  slot: 0,
  status: 'streaming',
  text: '',
  ...extra,
});

describe('toSlotCardState', () => {
  it('shows a slot with no text yet as pending (a queued request), then streaming', () => {
    expect(toSlotCardState(view({}))).toMatchObject({
      key: 'pending',
      label: 'waiting',
      canStop: true,
    });
    expect(toSlotCardState(view({ text: 'Once' }))).toMatchObject({
      key: 'streaming',
      canStop: true,
      body: 'Once',
    });
  });

  it('shows a failure with its error and no stop', () => {
    expect(
      toSlotCardState(view({ status: 'error', error: 'rate limited' }))
    ).toEqual({
      key: 'failed',
      label: 'failed',
      canStop: false,
      body: 'rate limited',
    });
  });

  it("carries a failure's detail for the details tap, and only on failures", () => {
    expect(
      toSlotCardState(
        view({
          status: 'error',
          error: 'LM Studio returned an error.',
          errorDetail: '[lmstudio:unknown] boom',
        })
      )
    ).toMatchObject({
      key: 'failed',
      body: 'LM Studio returned an error.',
      detail: '[lmstudio:unknown] boom',
    });
    expect(
      toSlotCardState(view({ text: 'Once', errorDetail: 'stale' })).detail
    ).toBeUndefined();
  });

  it('marks stopped and interrupted cards, saying when nothing was saved', () => {
    expect(
      toSlotCardState(
        view({ status: 'cancelled', text: 'Half', nodeId: 'n1' as ULID })
      )
    ).toMatchObject({ key: 'stopped', label: 'stopped', body: 'Half' });
    expect(toSlotCardState(view({ status: 'cancelled' })).body).toContain(
      'Nothing was saved'
    );
    expect(
      toSlotCardState(
        view({
          status: 'interrupted',
          text: 'Cut',
          interruptionReason: 'network',
        })
      )
    ).toMatchObject({ key: 'interrupted', label: 'interrupted (network)' });
    expect(
      toSlotCardState(view({ status: 'stopping', text: 'x' }))
    ).toMatchObject({
      key: 'stopping',
      canStop: false,
    });
  });
});
