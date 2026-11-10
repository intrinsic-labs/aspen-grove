import { useCallback } from 'react';
import type { INodeRepository } from '@application/repositories';
import type { ICredentialStore } from '@application/services/security';
import type { GenerateTreeTitleUseCase } from '@application/use-cases';
import type { ULID } from '@domain/value-objects';
import { contentToPlainText } from '../node-text';
import { getProviderApiKey } from '../provider-key';
import type { ChatSession } from '../types';

type UseAutoTreeTitleInput = {
  readonly session: ChatSession | null;
  readonly nodeRepo: Pick<INodeRepository, 'findById'>;
  readonly credentialStore: ICredentialStore;
  readonly generateTreeTitleUseCase: Pick<GenerateTreeTitleUseCase, 'execute'>;
  readonly applyTreeTitle: (title: string) => void;
};

/**
 * Fire-and-forget: one extra model call that replaces the default
 * timestamp title after the first exchange. The use case itself skips
 * when the toggle is off or the tree is already titled; failures are
 * silent (titling must never disturb the conversation).
 */
export const useAutoTreeTitle = ({
  session,
  nodeRepo,
  credentialStore,
  generateTreeTitleUseCase,
  applyTreeTitle,
}: UseAutoTreeTitleInput) =>
  useCallback(
    (userText: string, assistantNodeId: ULID) => {
      if (!session) {
        return;
      }
      const currentSession = session;
      void (async () => {
        try {
          const assistantNode = await nodeRepo.findById(assistantNodeId, true);
          const assistantText = assistantNode
            ? contentToPlainText(assistantNode.content)
            : '';
          if (!assistantText) {
            return;
          }
          const providerApiKey = await getProviderApiKey(
            credentialStore,
            currentSession.provider
          );
          const result = await generateTreeTitleUseCase.execute({
            treeId: currentSession.treeId,
            modelAgentId: currentSession.modelAgentId,
            modelIdentifier: currentSession.modelIdentifier,
            providerApiKey,
            providerAppName: 'Aspen Grove RN',
            userText,
            assistantText,
          });
          if (result.title) {
            applyTreeTitle(result.title);
          }
        } catch {
          // Silent: keep the default title on any failure.
        }
      })();
    },
    [
      applyTreeTitle,
      credentialStore,
      generateTreeTitleUseCase,
      nodeRepo,
      session,
    ]
  );
