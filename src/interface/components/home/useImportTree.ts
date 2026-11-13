import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useAppBootstrapState, useAppServices } from '@interface/composition';
import { pickAndReadTextFile } from '@interface/services/loom-file-sharing';

type UseImportTreeInput = {
  /** Reloads the list once the import lands. */
  readonly reload: () => Promise<void>;
  readonly setError: (message: string | null) => void;
};

/**
 * Home menu's "Import OpenLoom Tree" (HomeScreenView.swift:126-133): picks a
 * file, imports it as one or more trees (Open Loom and the legacy loom
 * formats) and reports what came in.
 */
export const useImportTree = ({ reload, setError }: UseImportTreeInput) => {
  const { useCases } = useAppServices();
  const bootstrapState = useAppBootstrapState();
  const bootstrap =
    bootstrapState.status === 'ready' ? bootstrapState.result : null;
  const [importing, setImporting] = useState(false);

  const importTree = useCallback(async () => {
    if (!bootstrap || importing) {
      return;
    }
    try {
      setError(null);
      const picked = await pickAndReadTextFile();
      if (!picked) {
        return;
      }
      setImporting(true);
      const result = await useCases.importLoomTreeUseCase.execute({
        groveId: bootstrap.groveId,
        ownerAgentId: bootstrap.ownerAgentId,
        raw: picked.content,
      });
      await reload();

      const summary = result.trees
        .map((tree) => `“${tree.title}” (${tree.nodeCount} nodes)`)
        .join(', ');
      Alert.alert(
        'Import complete',
        [`Imported ${summary} from ${result.sourceFormat}.`, ...result.warnings]
          .join('\n\n')
          .trim()
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setImporting(false);
    }
  }, [bootstrap, importing, reload, setError, useCases.importLoomTreeUseCase]);

  return { importing, importTree };
};
