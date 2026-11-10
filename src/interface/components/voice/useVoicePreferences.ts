import { useCallback, useEffect, useRef, useState } from 'react';
import type { IVoicePreferencesRepository } from '@application/repositories';
import type { VoicePreferences } from '@domain/entities';
import { DEFAULT_LOOM_VOICE } from '@domain/value-objects';

const DEFAULT_PREFERENCES: VoicePreferences = {
  voiceModeEnabled: false,
  voiceName: DEFAULT_LOOM_VOICE.name,
};

const toMessage = (caught: unknown) =>
  caught instanceof Error ? caught.message : String(caught);

/**
 * Loads Voice Mode preferences once and saves each change as it is made
 * (a switch or a voice pick is one discrete change, so no debounce).
 * `preferencesRef` always holds the latest value, for callbacks that outlive
 * a render, such as the auto-read after a generation finishes.
 */
export const useVoicePreferences = (repo: IVoicePreferencesRepository) => {
  const [preferences, setPreferences] =
    useState<VoicePreferences>(DEFAULT_PREFERENCES);
  const preferencesRef = useRef(preferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((next: VoicePreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    repo
      .get()
      .then((loaded) => {
        if (!cancelled) apply(loaded);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(toMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apply, repo]);

  const update = useCallback(
    async (changes: Partial<VoicePreferences>) => {
      apply({ ...preferencesRef.current, ...changes });
      setSaving(true);
      setError(null);
      try {
        apply(await repo.update(changes));
      } catch (caught) {
        setError(toMessage(caught));
      } finally {
        setSaving(false);
      }
    },
    [apply, repo]
  );

  return { preferences, preferencesRef, loading, saving, error, update };
};
