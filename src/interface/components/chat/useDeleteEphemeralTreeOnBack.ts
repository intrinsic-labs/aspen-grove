import { usePreventRemove } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useRef } from 'react';
import type { ILoomTreeRepository } from '@application/repositories';
import type { ULID } from '@domain/value-objects';

type UseDeleteEphemeralTreeOnBackInput = {
  readonly shouldDeleteEmptyOnBlur: boolean;
  readonly hasUserSentMessage: boolean;
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
    input.shouldDeleteEmptyOnBlur &&
      !input.hasUserSentMessage &&
      Boolean(input.sessionTreeId),
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
      void input.treeRepo
        .hardDelete(treeId)
        .then((deleted) => {
          if (deleted) {
            console.info('[chat] deleted empty tree created from quick add', {
              treeId,
            });
          }
        })
        .finally(() => {
          input.onMarkAsNonEphemeral();
          isHandlingRef.current = false;
          input.navigation.dispatch(data.action);
        });
    }
  );
};
