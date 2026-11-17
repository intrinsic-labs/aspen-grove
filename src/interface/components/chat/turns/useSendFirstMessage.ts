import { useEffect } from 'react';
import type { ULID } from '@domain/value-objects';
import { hasFirstMessage, takeFirstMessage } from './first-message-store';

type UseSendFirstMessageInput = {
  readonly treeId: ULID | undefined;
  /** The session and display preferences are loaded. */
  readonly loaded: boolean;
  /** The tree has an agent to answer with. */
  readonly canGenerate: boolean;
  readonly sendPrompt: (text: string) => Promise<void>;
  /** Puts the message in the composer instead, when it can't be sent. */
  readonly keepAsDraft: (text: string) => void;
};

/**
 * Sends the first message Home's composer left for this tree, once the tree
 * has loaded, through the composer's own send path: the reply streams in as
 * if the message had been typed here (HomeScreenView.swift `createtree`).
 * A message carried over from before setup, or one a tree can't generate
 * for, is kept as the composer's draft instead.
 */
export const useSendFirstMessage = ({
  treeId,
  loaded,
  canGenerate,
  sendPrompt,
  keepAsDraft,
}: UseSendFirstMessageInput) => {
  useEffect(() => {
    if (!loaded || !treeId || !hasFirstMessage(treeId)) {
      return;
    }
    const message = takeFirstMessage(treeId);
    if (!message?.text) {
      return;
    }
    if (message.mode === 'send' && canGenerate) {
      void sendPrompt(message.text);
    } else {
      keepAsDraft(message.text);
    }
  }, [canGenerate, keepAsDraft, loaded, sendPrompt, treeId]);
};
