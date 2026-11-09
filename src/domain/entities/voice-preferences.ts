import type { LoomVoiceName } from '../value-objects/loom-voice';

/**
 * Voice Mode preferences: whether model responses are read aloud, and by
 * which character voice. App-wide, like the rest of the user's preferences.
 */
export interface VoicePreferences {
  readonly voiceModeEnabled: boolean;
  readonly voiceName: LoomVoiceName;
}
