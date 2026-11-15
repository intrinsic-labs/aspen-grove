import { useCallback } from 'react';
import type { TitleTreeFromFirstMessageUseCase } from '@application/use-cases';
import type { ULID } from '@domain/value-objects';

type UseFirstMessageTreeTitleInput = {
  readonly treeId: ULID | undefined;
  readonly titleTreeFromFirstMessageUseCase: Pick<
    TitleTreeFromFirstMessageUseCase,
    'execute'
  >;
  readonly applyTreeTitle: (title: string) => void;
};

/**
 * Fire-and-forget: once the first message is saved, an untitled tree takes
 * its first words as its title (Latent Spaces' naming). Failures keep the
 * placeholder silently.
 */
export const useFirstMessageTreeTitle = ({
  treeId,
  titleTreeFromFirstMessageUseCase,
  applyTreeTitle,
}: UseFirstMessageTreeTitleInput) =>
  useCallback(
    (firstMessage: string) => {
      if (!treeId) {
        return;
      }
      void titleTreeFromFirstMessageUseCase
        .execute({ treeId, firstMessage })
        .then((title) => {
          if (title) {
            applyTreeTitle(title);
          }
        })
        .catch(() => undefined);
    },
    [applyTreeTitle, titleTreeFromFirstMessageUseCase, treeId]
  );
