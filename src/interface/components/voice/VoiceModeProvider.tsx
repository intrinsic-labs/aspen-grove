import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  findLoomVoice,
  type LoomVoice,
  type LoomVoiceName,
  type ULID,
} from '@domain/value-objects';
import { useAppServices } from '@interface/composition';
import {
  useReadAloudPlayback,
  type ReadAloudPlayback,
} from './useReadAloudPlayback';
import { useVoiceModeToggle } from './useVoiceModeToggle';
import { useVoicePreferences } from './useVoicePreferences';

type VoiceModeContextValue = {
  readonly loading: boolean;
  readonly saving: boolean;
  readonly error: string | null;
  readonly voiceModeEnabled: boolean;
  readonly voice: LoomVoice;
  readonly setVoiceModeEnabled: (enabled: boolean) => void;
  readonly setVoice: (name: LoomVoiceName) => void;
  readonly playback: ReadAloudPlayback | null;
  /** Reads a node aloud in the chosen voice; does nothing with Voice Mode off. */
  readonly speakNode: (nodeId: ULID, text: string) => void;
  /** Plays a voice's sample line (the chooser's demo; not gated). */
  readonly demoVoice: (voice: LoomVoice) => void;
  readonly stopSpeaking: () => void;
};

const VoiceModeContext = createContext<VoiceModeContextValue | null>(null);

/**
 * App-wide Voice Mode (Latent Spaces' `SpeechSynthesizer` environment
 * object): the preferences, and the one utterance playing, shared by
 * Settings → Voice Mode and the dialogue screen.
 */
export const VoiceModeProvider = ({ children }: { children: ReactNode }) => {
  const { repositories, speech } = useAppServices();
  const preferences = useVoicePreferences(repositories.voicePreferencesRepo);
  const playback = useReadAloudPlayback(speech.readAloud);
  const { preferencesRef, update } = preferences;
  const { speakNode: speakNodeInVoice, stopSpeaking } = playback;

  const speakNode = useCallback(
    (nodeId: ULID, text: string) => {
      const { voiceModeEnabled, voiceName } = preferencesRef.current;
      if (voiceModeEnabled) {
        speakNodeInVoice(nodeId, text, findLoomVoice(voiceName));
      }
    },
    [preferencesRef, speakNodeInVoice]
  );
  const setVoiceModeEnabled = useVoiceModeToggle({ update, stopSpeaking });
  const setVoice = useCallback(
    (name: LoomVoiceName) => void update({ voiceName: name }),
    [update]
  );

  const value = useMemo<VoiceModeContextValue>(
    () => ({
      loading: preferences.loading,
      saving: preferences.saving,
      error: preferences.error,
      voiceModeEnabled: preferences.preferences.voiceModeEnabled,
      voice: findLoomVoice(preferences.preferences.voiceName),
      setVoiceModeEnabled,
      setVoice,
      playback: playback.playback,
      speakNode,
      demoVoice: playback.demoVoice,
      stopSpeaking: playback.stopSpeaking,
    }),
    [
      playback.demoVoice,
      playback.playback,
      playback.stopSpeaking,
      preferences.error,
      preferences.loading,
      preferences.preferences,
      preferences.saving,
      setVoice,
      setVoiceModeEnabled,
      speakNode,
    ]
  );

  return (
    <VoiceModeContext.Provider value={value}>
      {children}
    </VoiceModeContext.Provider>
  );
};

export const useVoiceMode = (): VoiceModeContextValue => {
  const context = useContext(VoiceModeContext);
  if (!context) {
    throw new Error('useVoiceMode must be used within VoiceModeProvider');
  }
  return context;
};
