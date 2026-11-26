import { useCallback, useEffect, useRef } from 'react';
import type { WebEditorSink } from './buffer-web-editor-props';
import type { EditorMessage, HostMessage } from './web-editor-protocol';
import {
  reduceSession,
  startSession,
  type SessionAction,
} from './web-editor-session';

/** Acknowledgements are batched: the page only needs the latest revision. */
const ACK_DELAY_MS = 120;

/**
 * Runs the revision protocol for one mounted editor: feeds page messages
 * through the pure session reducer and carries out what it says. Only
 * acknowledgements and checkpoint requests go back to the page, never text.
 */
export const useEditorSession = (
  epoch: number,
  sink: WebEditorSink,
  send: (message: HostMessage) => void
) => {
  const nextId = useRef(0);
  const pending = useRef<{
    epoch: number;
    requestId: number;
    revision?: number;
    finish: () => void;
    cancel: (reason: string) => void;
  } | null>(null);
  useEffect(
    () => () => pending.current?.cancel('The editor document changed.'),
    [epoch]
  );

  const settle = useCallback(
    () =>
      new Promise<void>((resolve, reject) => {
        pending.current?.cancel('Another editor request started.');
        const requestId = ++nextId.current;
        const clear = () => {
          clearTimeout(timer);
          pending.current = null;
        };
        const cancel = (reason: string) => {
          clear();
          reject(new Error(reason));
        };
        const timer = setTimeout(
          () =>
            cancel(
              'The editor timed out while confirming your last edit. Try again.'
            ),
          1500
        );
        pending.current = {
          epoch,
          requestId,
          cancel,
          finish: () => {
            clear();
            resolve();
          },
        };
        send({ type: 'settle', epoch, requestId });
      }),
    [epoch, send]
  );
  const session = useRef(startSession(epoch));
  const ackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ackRevision = useRef(0);

  useEffect(() => () => clearTimeout(ackTimer.current), []);

  const scheduleAck = useCallback(
    (revision: number) => {
      ackRevision.current = revision;
      if (ackTimer.current === undefined) {
        ackTimer.current = setTimeout(() => {
          ackTimer.current = undefined;
          send({
            type: 'ack',
            epoch: session.current.epoch,
            revision: ackRevision.current,
          });
        }, ACK_DELAY_MS);
      }
    },
    [send]
  );

  const perform = useCallback(
    (action: SessionAction) => {
      switch (action.type) {
        case 'apply':
          sink.onChanges(action.replacements, action.caret, action.modelRanges);
          break;
        case 'adopt':
          sink.onAdopt(
            action.text,
            action.modelRanges,
            action.layout,
            action.caret
          );
          break;
        case 'ack':
          scheduleAck(action.revision);
          break;
        case 'requestCheckpoint':
          send({ type: 'checkpointRequest', epoch: session.current.epoch });
          break;
        case 'applied':
          sink.onApplied(action);
          break;
        case 'caretMoved':
          sink.onCaretMoved(action.selection);
          break;
        case 'composition':
          sink.onComposition(action.composing);
          break;
      }
    },
    [send, scheduleAck, sink]
  );

  const receive = useCallback(
    (message: EditorMessage) => {
      if (session.current.epoch !== epoch) {
        session.current = startSession(epoch);
      }
      const step = reduceSession(session.current, message);
      step.actions.forEach(perform);
      session.current = step.state;
      const waiting = pending.current;
      if (!waiting || waiting.epoch !== epoch) return;
      if (
        message.type === 'settled' &&
        message.epoch === epoch &&
        message.requestId === waiting.requestId
      ) {
        waiting.revision = message.revision;
      }
      if (
        waiting.revision !== undefined &&
        step.state.revision >= waiting.revision &&
        !step.state.awaitingCheckpoint
      ) {
        waiting.finish();
      }
    },
    [epoch, perform]
  );
  return { receive, settle };
};
