import type { Database } from '@nozbe/watermelondb';
import type {
  IUserPreferencesRepository,
  IVoicePreferencesRepository,
} from '@application/repositories';
import type { VoicePreferences } from '@domain/entities';
import { findLoomVoice } from '@domain/value-objects';

const VOICE_NAME_KEY = 'aspen_grove.voice_mode.voice_name';

/**
 * Voice Mode preferences without a schema change: the on/off flag is the
 * existing `user_preferences.default_voice_mode_enabled` column, and the
 * chosen voice is a key in WatermelonDB's local key-value storage (the same
 * store the OpenRouter catalog cache uses).
 */
export class WatermelonVoicePreferencesRepository implements IVoicePreferencesRepository {
  private readonly database: Database;
  private readonly userPreferences: IUserPreferencesRepository;

  constructor(database: Database, userPreferences: IUserPreferencesRepository) {
    this.database = database;
    this.userPreferences = userPreferences;
  }

  async get(): Promise<VoicePreferences> {
    const [preferences, voiceName] = await Promise.all([
      this.userPreferences.get(),
      this.readVoiceName(),
    ]);
    return {
      voiceModeEnabled: preferences.defaultVoiceModeEnabled,
      voiceName: findLoomVoice(voiceName).name,
    };
  }

  async update(changes: Partial<VoicePreferences>): Promise<VoicePreferences> {
    if (changes.voiceModeEnabled !== undefined) {
      await this.userPreferences.update({
        defaultVoiceModeEnabled: changes.voiceModeEnabled,
      });
    }
    if (changes.voiceName !== undefined) {
      await this.database.localStorage.set(
        VOICE_NAME_KEY,
        findLoomVoice(changes.voiceName).name
      );
    }
    return this.get();
  }

  private async readVoiceName(): Promise<string | undefined> {
    try {
      return await this.database.localStorage.get<string>(VOICE_NAME_KEY);
    } catch {
      return undefined; // Unreadable means never chosen: use the default.
    }
  }
}
