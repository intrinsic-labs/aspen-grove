import type { VoicePreferences } from '@domain/entities';

/**
 * Persistence for Voice Mode preferences (on/off and the chosen voice).
 * Infrastructure implements this contract.
 */
export interface IVoicePreferencesRepository {
  /** The stored preferences, with defaults for anything never set. */
  get(): Promise<VoicePreferences>;

  /** Partial update: only the provided fields change. */
  update(changes: Partial<VoicePreferences>): Promise<VoicePreferences>;
}
