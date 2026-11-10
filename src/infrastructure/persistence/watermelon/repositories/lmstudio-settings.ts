import type { LMStudioSettings } from '@domain/entities';
import { DEFAULT_LMSTUDIO_SETTINGS } from '@domain/entities';

/**
 * Codec for the `user_preferences.lmstudio_settings` JSON column.
 *
 * Only known keys are read, so keys left by older app versions (such as the
 * cut `useMcpTools` switch) are ignored and dropped on the next save.
 */
export const parseLMStudioSettings = (
  json: string | null
): LMStudioSettings => {
  if (!json) {
    return DEFAULT_LMSTUDIO_SETTINGS;
  }
  try {
    const parsed = JSON.parse(json) as Partial<LMStudioSettings>;
    return {
      endpoint: parsed.endpoint ?? DEFAULT_LMSTUDIO_SETTINGS.endpoint,
      autoLoadModels:
        parsed.autoLoadModels ?? DEFAULT_LMSTUDIO_SETTINGS.autoLoadModels,
      idleTtlSeconds:
        parsed.idleTtlSeconds ?? DEFAULT_LMSTUDIO_SETTINGS.idleTtlSeconds,
    };
  } catch {
    return DEFAULT_LMSTUDIO_SETTINGS;
  }
};

export const mergeLMStudioSettings = (
  existing: LMStudioSettings,
  changes: Partial<LMStudioSettings>
): LMStudioSettings => ({
  endpoint: changes.endpoint ?? existing.endpoint,
  autoLoadModels: changes.autoLoadModels ?? existing.autoLoadModels,
  idleTtlSeconds: changes.idleTtlSeconds ?? existing.idleTtlSeconds,
});
