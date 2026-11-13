import {
  usePreventRemove,
  type NavigationProp,
  type ParamListBase,
} from 'expo-router/react-navigation';
import { useRef } from 'react';
import type { ILoomTreeRepository } from '@application/repositories';
import type { ULID } from '@domain/value-objects';
import { shouldDeleteTreeOnLeave } from './session/ephemeral-tree';

type UseDeleteEphemeralTreeOnBackInput = {
  readonly shouldDeleteEmptyOnBlur: boolean;
  readonly hasUserSentMessage: boolean;
  /** Rows on screen: a tree with messages is never deleted. */
  readonly hasMessages: boolean;
  readonly sessionTreeId?: ULID;
  readonly fallbackTreeId?: ULID | null;
  readonly treeRepo: Pick<ILoomTreeRepository, 'hardDelete'>;
  readonly navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>;
  readonly onMarkAsNonEphemeral: () => void;
};

/**
 * Deletes quick-created empty trees when user navigates away without sending.
 */
export const useDeleteEphemeralTreeOnBack = (
  input: UseDeleteEphemeralTreeOnBackInput
) => {
  const isHandlingRef = useRef(false);

  usePreventRemove(
    shouldDeleteTreeOnLeave({
      quickCreated: input.shouldDeleteEmptyOnBlur,
      hasUserSentMessage: input.hasUserSentMessage,
      hasMessages: input.hasMessages,
      hasTree: Boolean(input.sessionTreeId),
    }),
    ({ data }) => {
      if (isHandlingRef.current) {
        return;
      }

      const treeId = input.fallbackTreeId ?? input.sessionTreeId;
      if (!treeId) {
        input.navigation.dispatch(data.action);
        return;
      }

      isHandlingRef.current = true;
      void input.treeRepo.hardDelete(treeId).finally(() => {
        input.onMarkAsNonEphemeral();
        isHandlingRef.current = false;
        input.navigation.dispatch(data.action);
      });
    }
  );
};
