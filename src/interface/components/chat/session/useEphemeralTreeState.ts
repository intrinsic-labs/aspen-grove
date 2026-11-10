import { useCallback, useState } from 'react';
import type { ILoomTreeRepository } from '@application/repositories';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { ULID } from '@domain/value-objects';
import { useDeleteEphemeralTreeOnBack } from '../useDeleteEphemeralTreeOnBack';

type UseEphemeralTreeStateInput = {
  readonly shouldDeleteEmptyOnBlur: boolean;
  readonly hasMessages: boolean;
  readonly sessionTreeId?: ULID;
  readonly fallbackTreeId: ULID | null;
  readonly treeRepo: Pick<ILoomTreeRepository, 'hardDelete'>;
  readonly navigation: Pick<NavigationProp<ParamListBase>, 'dispatch'>;
};

/**
 * Whether this tree is still an untouched quick-add tree. Until the user
 * sends something, leaving the screen deletes the empty tree.
 */
export const useEphemeralTreeState = ({
  shouldDeleteEmptyOnBlur,
  hasMessages,
  sessionTreeId,
  fallbackTreeId,
  treeRepo,
  navigation,
}: UseEphemeralTreeStateInput) => {
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);

  const markAsNonEphemeral = useCallback(() => {
    setHasUserSentMessage(true);
  }, []);

  const resetEphemeralState = useCallback(() => {
    setHasUserSentMessage(false);
  }, []);

  useDeleteEphemeralTreeOnBack({
    shouldDeleteEmptyOnBlur,
    hasUserSentMessage,
    hasMessages,
    sessionTreeId,
    fallbackTreeId,
    treeRepo,
    navigation,
    onMarkAsNonEphemeral: markAsNonEphemeral,
  });

  return { markAsNonEphemeral, resetEphemeralState };
};
