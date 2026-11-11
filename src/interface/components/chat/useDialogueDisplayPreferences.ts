import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router/react-navigation';
import type { IUserPreferencesRepository } from '@application/repositories';
import { sameDisplayPreferences } from './display-preferences-equality';
import type { ChatDisplayPreferences } from './types';

const DEFAULT_FONT_SIZE = 17;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 30;
const DEFAULT_CORNER_RADIUS = 8;
const MAX_CORNER_RADIUS = 32;

const SUPPORTED_FONT_FAMILIES = new Set<string>([
  'Cardo-Regular',
  'IBMPlexMono-Regular',
  'OpenSans-Regular',
]);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toMessageLineHeight = (messageFontSize: number): number =>
  Math.round(messageFontSize * 1.58);

const normalizeFontFamily = (fontFace?: string): string | undefined => {
  if (!fontFace) {
    return undefined;
  }
  const normalized = fontFace.trim();
  return SUPPORTED_FONT_FAMILIES.has(normalized) ? normalized : undefined;
};

const createDefaults = (): ChatDisplayPreferences => ({
  userNodeViewStyle: 'filled',
  userNodeCornerRadius: DEFAULT_CORNER_RADIUS,
  messageFontSize: DEFAULT_FONT_SIZE,
  messageLineHeight: toMessageLineHeight(DEFAULT_FONT_SIZE),
  messageFontFamily: undefined,
});

export type DialogueDisplayPreferences = {
  readonly preferences: ChatDisplayPreferences;
  /**
   * The saved preferences have been read (or failed to read, leaving the
   * defaults). Until then `preferences` holds defaults that may differ:
   * render messages only once loaded, or they lay out twice in two sizes.
   */
  readonly loaded: boolean;
};

type UseDialogueDisplayPreferencesInput = {
  readonly userPreferencesRepo: Pick<IUserPreferencesRepository, 'get'>;
};

export const useDialogueDisplayPreferences = ({
  userPreferencesRepo,
}: UseDialogueDisplayPreferencesInput): DialogueDisplayPreferences => {
  const [preferences, setPreferences] =
    useState<ChatDisplayPreferences>(createDefaults);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const userPreferences = await userPreferencesRepo.get();
      const messageFontSize = clamp(
        userPreferences.fontSize,
        MIN_FONT_SIZE,
        MAX_FONT_SIZE
      );

      const next: ChatDisplayPreferences = {
        userNodeViewStyle: userPreferences.nodeViewStyle,
        userNodeCornerRadius: clamp(
          userPreferences.nodeViewCornerRadius ?? DEFAULT_CORNER_RADIUS,
          0,
          MAX_CORNER_RADIUS
        ),
        messageFontSize,
        messageLineHeight: toMessageLineHeight(messageFontSize),
        messageFontFamily: normalizeFontFamily(userPreferences.fontFace),
      };
      // Every focus reloads; keep the same object when nothing changed so
      // the message list doesn't re-render.
      setPreferences((current) =>
        sameDisplayPreferences(current, next) ? current : next
      );
    } catch {
      // Keep existing preferences on load failure.
    }
    setLoaded(true);
  }, [userPreferencesRepo]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  return useMemo(() => ({ preferences, loaded }), [preferences, loaded]);
};
