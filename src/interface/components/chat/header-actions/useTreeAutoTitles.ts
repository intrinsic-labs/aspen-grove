import { useAutoTreeTitle } from './useAutoTreeTitle';
import { useFirstMessageTreeTitle } from './useFirstMessageTreeTitle';

type AutoTitleInput = Parameters<typeof useAutoTreeTitle>[0];
type FirstMessageTitleInput = Parameters<typeof useFirstMessageTreeTitle>[0];

type UseTreeAutoTitlesInput = AutoTitleInput &
  Pick<FirstMessageTitleInput, 'titleTreeFromFirstMessageUseCase'>;

/**
 * How a tree names itself: its first message's words once that message is
 * saved, then (Auto-Title on) a model-written title after the first reply.
 */
export const useTreeAutoTitles = ({
  titleTreeFromFirstMessageUseCase,
  ...autoTitle
}: UseTreeAutoTitlesInput) => ({
  maybeGenerateTreeTitle: useAutoTreeTitle(autoTitle),
  titleFromFirstMessage: useFirstMessageTreeTitle({
    treeId: autoTitle.session?.treeId,
    titleTreeFromFirstMessageUseCase,
    applyTreeTitle: autoTitle.applyTreeTitle,
  }),
});
