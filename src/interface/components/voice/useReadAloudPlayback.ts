import { useCallback, useEffect, useState } from 'react';
import type { ReadAloudService } from '@application/services/speech';
import type { LoomVoice, LoomVoiceName, ULID } from '@domain/value-objects';

/** What is being read aloud right now, if anything. */
export type ReadAloudPlayback =
  | { readonly kind: 'node'; readonly nodeId: ULID; readonly voice: LoomVoice }
  | { readonly kind: 'demo'; readonly voiceName: LoomVoiceName };

/**
 * Tracks the one utterance playing through `ReadAloudService`. State is set
 * as soon as speech is requested (Latent Spaces' `listeningToNode`), so the
 * node takes its voice color at once, and cleared when the service reports
 * the utterance ended, was stopped or failed.
 */
export const useReadAloudPlayback = (readAloud: ReadAloudService) => {
  const [playback, setPlayback] = useState<ReadAloudPlayback | null>(null);

  const play = useCallback(
    (next: ReadAloudPlayback, start: (onEnd: () => void) => Promise<void>) => {
      setPlayback(next);
      const onEnd = () =>
        setPlayback((current) => (current === next ? null : current));
      start(onEnd).catch(onEnd);
    },
    []
  );

  const speakNode = useCallback(
    (nodeId: ULID, text: string, voice: LoomVoice) => {
      play({ kind: 'node', nodeId, voice }, (onEnd) =>
        readAloud.speakText(text, voice, { onEnd })
      );
    },
    [play, readAloud]
  );

  const demoVoice = useCallback(
    (voice: LoomVoice) => {
      play({ kind: 'demo', voiceName: voice.name }, (onEnd) =>
        readAloud.demo(voice, { onEnd })
      );
    },
    [play, readAloud]
  );

  const stopSpeaking = useCallback(() => {
    setPlayback(null);
    void readAloud.stop();
  }, [readAloud]);

  // Leaving the app's root (a reload in development) stops speech.
  useEffect(() => () => void readAloud.stop(), [readAloud]);

  return { playback, speakNode, demoVoice, stopSpeaking };
};
