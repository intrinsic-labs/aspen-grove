import { describe, expect, it, jest } from '@jest/globals';
import type { VoicePreferences } from '@domain/entities';
import { act, renderHook } from '@interface/test-support/render-hook';
import { useVoiceModeToggle } from './useVoiceModeToggle';

const setup = () => {
  const update = jest.fn(async (_changes: Partial<VoicePreferences>) => {});
  const stopSpeaking = jest.fn(() => {});
  const hook = renderHook(
    () => useVoiceModeToggle({ update, stopSpeaking }),
    {}
  );
  return { hook, update, stopSpeaking };
};

describe('useVoiceModeToggle', () => {
  it('stops the utterance playing when Voice Mode is turned off', async () => {
    const { hook, update, stopSpeaking } = setup();
    await act(() => hook.result.current(false));
    expect(stopSpeaking).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ voiceModeEnabled: false });
  });

  it('leaves speech alone when Voice Mode is turned on', async () => {
    const { hook, update, stopSpeaking } = setup();
    await act(() => hook.result.current(true));
    expect(stopSpeaking).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ voiceModeEnabled: true });
  });
});
