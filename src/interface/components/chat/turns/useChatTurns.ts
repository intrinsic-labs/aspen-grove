import { useRegenerateFromNode } from './useRegenerateFromNode';
import { useSendTurn } from './useSendTurn';

type RegenerateInput = Parameters<typeof useRegenerateFromNode>[0];
type SendInput = Parameters<typeof useSendTurn>[0];
type TurnUseCases = Pick<
  RegenerateInput,
  'generateDialogueContinuationUseCase'
> &
  Pick<SendInput, 'editDialogueNodeUseCase' | 'sendDialogueTurnUseCase'>;

type UseChatTurnsInput = Omit<RegenerateInput, keyof TurnUseCases> &
  Omit<SendInput, keyof TurnUseCases> & {
    readonly useCases: TurnUseCases;
  };

/**
 * The single-reply turns: the composer's Send (or an edit saved as a
 * sibling) and Regenerate from a node. Both share the same plumbing:
 * `sending`, the streaming row, the composer's stop button, error notices,
 * auto-scroll and the reload after the reply is saved.
 */
export const useChatTurns = ({ useCases, ...turn }: UseChatTurnsInput) => {
  const regenerateFromNode = useRegenerateFromNode({
    ...turn,
    generateDialogueContinuationUseCase:
      useCases.generateDialogueContinuationUseCase,
  });
  const { onSend, sendPrompt } = useSendTurn({
    ...turn,
    editDialogueNodeUseCase: useCases.editDialogueNodeUseCase,
    sendDialogueTurnUseCase: useCases.sendDialogueTurnUseCase,
  });
  return { regenerateFromNode, onSend, sendPrompt };
};
