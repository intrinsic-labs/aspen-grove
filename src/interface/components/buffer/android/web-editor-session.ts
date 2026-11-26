import type { Replacement } from '@application/services/buffer/apply-replacement';
import type { OwnerLayout } from '@application/services/buffer/owner-layout';
import {
  toReplacements,
  type EditorMessage,
  type ModelRange,
  type Selection,
} from './web-editor-protocol';

/**
 * The host's side of the revision protocol, as a pure reducer. The page
 * numbers each edit; the host applies each exactly once, in order, and
 * answers with what to do next. A gap (an edit that does not build on the
 * last applied revision) is never patched over: the host asks the page for a
 * checkpoint and resumes from it. Nothing here ever sends text to the page.
 */
export type SessionState = {
  readonly epoch: number;
  /** The last revision applied (0 right after a load). */
  readonly revision: number;
  /** A checkpoint was requested; edits are held back until it arrives. */
  readonly awaitingCheckpoint: boolean;
};

export type SessionAction =
  | {
      readonly type: 'apply';
      /** One transaction, every replacement against the pre-edit document. */
      readonly replacements: readonly Replacement[];
      /** The caret after the edit. */
      readonly caret: number;
      /** Undo/redo: the authorship to restore, exact. */
      readonly modelRanges?: readonly ModelRange[];
    }
  | {
      readonly type: 'adopt';
      readonly text: string;
      readonly modelRanges: readonly ModelRange[];
      readonly layout: OwnerLayout;
      readonly caret: number;
    }
  | { readonly type: 'ack'; readonly revision: number }
  | { readonly type: 'requestCheckpoint' }
  | { readonly type: 'composition'; readonly composing: boolean }
  | { readonly type: 'caretMoved'; readonly selection: Selection }
  | {
      readonly type: 'applied';
      readonly revision: number;
      readonly head: number;
      readonly composing: boolean;
    };

export type SessionStep = {
  readonly state: SessionState;
  readonly actions: readonly SessionAction[];
};

export const startSession = (epoch: number): SessionState => ({
  epoch,
  revision: 0,
  awaitingCheckpoint: false,
});

const none = (state: SessionState): SessionStep => ({ state, actions: [] });

const receiveChanges = (
  state: SessionState,
  message: Extract<EditorMessage, { type: 'changes' }>
): SessionStep => {
  if (message.revision <= state.revision) {
    // Already applied: ignored, but re-acknowledged so the page can move on.
    return {
      state,
      actions: [{ type: 'ack', revision: state.revision }],
    };
  }
  if (state.awaitingCheckpoint) {
    return none(state);
  }
  if (message.prevRevision !== state.revision) {
    return {
      state: { ...state, awaitingCheckpoint: true },
      actions: [{ type: 'requestCheckpoint' }],
    };
  }
  return {
    state: { ...state, revision: message.revision },
    actions: [
      {
        type: 'apply',
        replacements: toReplacements(message.replacements),
        caret: message.selection.head,
        modelRanges: message.modelRanges,
      },
      { type: 'ack', revision: message.revision },
      {
        type: 'applied',
        revision: message.revision,
        head: message.selection.head,
        composing: message.composing,
      },
    ],
  };
};

const receiveCheckpoint = (
  state: SessionState,
  message: Extract<EditorMessage, { type: 'checkpoint' }>
): SessionStep =>
  message.revision < state.revision
    ? none(state)
    : {
        state: {
          ...state,
          revision: message.revision,
          awaitingCheckpoint: false,
        },
        actions: [
          {
            type: 'adopt',
            text: message.text,
            modelRanges: message.modelRanges,
            layout: { ends: message.ends, hold: message.hold },
            caret: message.selection.head,
          },
          { type: 'ack', revision: message.revision },
          {
            type: 'applied',
            revision: message.revision,
            head: message.selection.head,
            composing: message.composing,
          },
        ],
      };

/** One page message; anything from another epoch is dropped. */
export const reduceSession = (
  state: SessionState,
  message: EditorMessage
): SessionStep => {
  if (message.type === 'ready' || message.epoch !== state.epoch) {
    return none(state);
  }
  switch (message.type) {
    case 'settled':
      return none(state);
    case 'changes':
      return receiveChanges(state, message);
    case 'checkpoint':
      return receiveCheckpoint(state, message);
    case 'selection':
      return {
        state,
        actions: [{ type: 'caretMoved', selection: message.selection }],
      };
    case 'composition':
      return {
        state,
        actions: [{ type: 'composition', composing: message.composing }],
      };
  }
};
