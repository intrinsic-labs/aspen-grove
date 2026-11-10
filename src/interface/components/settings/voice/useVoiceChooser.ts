import { useCallback, useEffect, useState } from 'react';
import {
  LOOM_VOICES,
  findLoomVoice,
  type LoomVoice,
  type LoomVoiceName,
} from '@domain/value-objects';
import { useVoiceMode } from '../../voice';

const indexOfVoice = (name: LoomVoiceName) =>
  Math.max(
    0,
    LOOM_VOICES.findIndex((voice) => voice.name === name)
  );

/**
 * The voice chooser's behavior, as in Latent Spaces' `LoomVoiceChooser`:
 * opening it plays the saved voice, swiping to another voice plays that one,
 * tapping a portrait stops speech or plays it, closing stops speech, and
 * Select saves the shown voice.
 */
export const useVoiceChooser = (visible: boolean, onClose: () => void) => {
  const { voice, setVoice, demoVoice, stopSpeaking, playback } = useVoiceMode();
  const [index, setIndex] = useState(() => indexOfVoice(voice.name));

  useEffect(() => {
    if (!visible) {
      return;
    }
    setIndex(indexOfVoice(voice.name));
    demoVoice(findLoomVoice(voice.name));
    return stopSpeaking;
    // Only on open: re-running when the saved voice changes would replay it.
  }, [visible]);

  const showPage = useCallback(
    (nextIndex: number) => {
      const next = LOOM_VOICES[nextIndex];
      if (!next || nextIndex === index) {
        return;
      }
      setIndex(nextIndex);
      demoVoice(next);
    },
    [demoVoice, index]
  );

  const onPressPortrait = useCallback(
    (pressed: LoomVoice) => {
      if (playback) {
        stopSpeaking();
      } else {
        demoVoice(pressed);
      }
    },
    [demoVoice, playback, stopSpeaking]
  );

  const select = useCallback(() => {
    setVoice(LOOM_VOICES[index].name);
    onClose();
  }, [index, onClose, setVoice]);

  return {
    index,
    /** The saved voice's page, where the pager opens. */
    savedIndex: indexOfVoice(voice.name),
    showPage,
    onPressPortrait,
    select,
  };
};
