import type { ChangesMessage, CheckpointMessage } from './web-editor-protocol';
import {
  reduceSession,
  startSession,
  type SessionAction,
  type SessionState,
} from './web-editor-session';

const changes = (
  prevRevision: number,
  overrides: Partial<ChangesMessage> = {}
): ChangesMessage => ({
  type: 'changes',
  epoch: 1,
  prevRevision,
  revision: prevRevision + 1,
  replacements: [{ from: 0, to: 0, insert: 'a' }],
  selection: { anchor: 1, head: 1 },
  composing: false,
  ...overrides,
});

const kinds = (actions: readonly SessionAction[]) => actions.map((a) => a.type);

describe('reduceSession', () => {
  it('applies edits in order, acknowledging each revision', () => {
    let state: SessionState = startSession(1);
    const first = reduceSession(state, changes(0));
    expect(kinds(first.actions)).toEqual(['apply', 'ack', 'applied']);
    expect(first.actions[0]).toMatchObject({
      replacements: [{ start: 0, end: 0, inserted: 'a' }],
      caret: 1,
    });
    expect(first.actions[1]).toEqual({ type: 'ack', revision: 1 });
    state = reduceSession(first.state, changes(1)).state;
    expect(state.revision).toBe(2);
  });

  it('applies a transaction exactly once: a duplicate only re-acknowledges', () => {
    const once = reduceSession(startSession(1), changes(0));
    const again = reduceSession(once.state, changes(0));
    expect(again.state).toEqual(once.state);
    expect(again.actions).toEqual([{ type: 'ack', revision: 1 }]);
  });

  it('turns a gap into one checkpoint request and holds later edits', () => {
    const gap = reduceSession(startSession(1), changes(2));
    expect(gap.actions).toEqual([{ type: 'requestCheckpoint' }]);
    expect(gap.state.awaitingCheckpoint).toBe(true);
    expect(gap.state.revision).toBe(0);
    const later = reduceSession(gap.state, changes(3));
    expect(later.actions).toEqual([]);
    expect(later.state).toEqual(gap.state);
  });

  it('resumes from the checkpoint and ignores edits it already contains', () => {
    const gap = reduceSession(startSession(1), changes(2)).state;
    const checkpoint: CheckpointMessage = {
      type: 'checkpoint',
      epoch: 1,
      revision: 4,
      text: 'whole text',
      modelRanges: [[0, 3]],
      ends: [4, 8, 10],
      hold: 1,
      selection: { anchor: 10, head: 10 },
      composing: false,
    };
    const resumed = reduceSession(gap, checkpoint);
    expect(resumed.state).toEqual({
      epoch: 1,
      revision: 4,
      awaitingCheckpoint: false,
    });
    expect(resumed.actions[0]).toEqual({
      type: 'adopt',
      text: 'whole text',
      modelRanges: [[0, 3]],
      layout: { ends: [4, 8, 10], hold: 1 },
      caret: 10,
    });
    expect(reduceSession(resumed.state, changes(3)).actions).toEqual([
      { type: 'ack', revision: 4 },
    ]);
    expect(kinds(reduceSession(resumed.state, changes(4)).actions)).toEqual([
      'apply',
      'ack',
      'applied',
    ]);
  });

  it('drops anything from another epoch', () => {
    const state = startSession(2);
    expect(reduceSession(state, changes(0, { epoch: 1 }))).toEqual({
      state,
      actions: [],
    });
    expect(
      reduceSession(state, {
        type: 'checkpoint',
        epoch: 1,
        revision: 5,
        text: 'old',
        modelRanges: [],
        ends: [0, 0, 3],
        selection: { anchor: 0, head: 0 },
        composing: false,
      }).actions
    ).toEqual([]);
  });

  it('keeps a checkpoint taken mid-composition composing', () => {
    const gap = reduceSession(startSession(1), changes(2)).state;
    const resumed = reduceSession(gap, {
      type: 'checkpoint',
      epoch: 1,
      revision: 3,
      text: 'かあ',
      modelRanges: [],
      ends: [0, 0, 2],
      selection: { anchor: 2, head: 2 },
      composing: true,
    });
    expect(resumed.actions[2]).toEqual({
      type: 'applied',
      revision: 3,
      head: 2,
      composing: true,
    });
  });

  it('passes the composing flag and the caret through', () => {
    const step = reduceSession(
      startSession(1),
      changes(0, { composing: true, selection: { anchor: 4, head: 7 } })
    );
    expect(step.actions[2]).toEqual({
      type: 'applied',
      revision: 1,
      head: 7,
      composing: true,
    });
  });

  it('carries restored model ranges from undo and redo', () => {
    const step = reduceSession(
      startSession(1),
      changes(0, { modelRanges: [[2, 5]] })
    );
    expect(step.actions[0]).toMatchObject({ modelRanges: [[2, 5]] });
  });

  it('reports a composition that ended without an edit', () => {
    const state = startSession(1);
    expect(
      reduceSession(state, { type: 'composition', epoch: 1, composing: false })
    ).toEqual({
      state,
      actions: [{ type: 'composition', composing: false }],
    });
    expect(
      reduceSession(state, { type: 'composition', epoch: 0, composing: false })
        .actions
    ).toEqual([]);
  });
});
