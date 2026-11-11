import { useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router/react-navigation';
import type { INodeRepository } from '@application/repositories';
import type { ULID } from '@domain/value-objects';
import { VOICE_APPEARANCE, useVoiceMode } from '../../voice';
import { contentToDisplayText } from '../node-text';
import type { ChatRow } from '../types';

/** The row being read aloud, tinted its voice's color. */
export type SpeakingRow = {
  readonly nodeId: ULID;
  readonly color: string;
};

type UseChatReadAloudInput = {
  readonly getRowById: (nodeId: ULID) => ChatRow | undefined;
  readonly nodeRepo: Pick<INodeRepository, 'findById'>;
};

/**
 * Voice Mode on the dialogue screen (Latent Spaces' `LoomTreeView` and
 * `NodeView`): a new model response is read once it has finished
 * generating, the row being read takes its voice's color, and leaving the
 * dialogue stops speech. `tapOptions` feeds `useReadAloudTaps`, which reads
 * a row on double-tap.
 *
 * "Leaving" means losing focus, as SwiftUI's `onDisappear` does in LS: a
 * pushed node screen, the expanded composer or a modal stops speech too, and
 * a reply that finishes generating while the dialogue is out of focus is not
 * read.
 */
export const useChatReadAloud = ({
  getRowById,
  nodeRepo,
}: UseChatReadAloudInput) => {
  const { voiceModeEnabled, playback, speakNode, stopSpeaking } =
    useVoiceMode();
  const focusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      return () => {
        focusedRef.current = false;
        stopSpeaking();
      };
    }, [stopSpeaking])
  );

  const readRowAloud = useCallback(
    (nodeId: ULID) => {
      const row = getRowById(nodeId);
      if (row && focusedRef.current) {
        speakNode(nodeId, row.text);
      }
    },
    [getRowById, speakNode]
  );

  const readGeneratedNodeAloud = useCallback(
    async (nodeId: ULID) => {
      try {
        const node = await nodeRepo.findById(nodeId, true);
        if (node && focusedRef.current) {
          speakNode(nodeId, contentToDisplayText(node.content));
        }
      } catch {
        // Reading aloud is a nicety; a failed lookup just stays silent.
      }
    },
    [nodeRepo, speakNode]
  );

  const speakingRow = useMemo<SpeakingRow | null>(
    () =>
      playback?.kind === 'node'
        ? {
            nodeId: playback.nodeId,
            color: VOICE_APPEARANCE[playback.voice.name].color,
          }
        : null,
    [playback]
  );

  return {
    readGeneratedNodeAloud,
    speakingRow,
    tapOptions: {
      voiceModeEnabled,
      speaking: playback !== null,
      readAloud: readRowAloud,
      stopSpeaking,
    },
  };
};
