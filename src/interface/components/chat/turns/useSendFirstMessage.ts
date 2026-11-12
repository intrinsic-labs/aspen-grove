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
 * A tree that can't generate keeps it as its draft instead.
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
    const text = takeFirstMessage(treeId);
    if (!text) {
      return;
    }
    if (canGenerate) {
      void sendPrompt(text);
    } else {
      keepAsDraft(text);
    }
  }, [canGenerate, keepAsDraft, loaded, sendPrompt, treeId]);
};
