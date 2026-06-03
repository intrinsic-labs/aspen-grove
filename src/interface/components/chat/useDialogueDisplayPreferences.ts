import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { IUserPreferencesRepository } from '@application/repositories';
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

type UseDialogueDisplayPreferencesInput = {
  readonly userPreferencesRepo: Pick<IUserPreferencesRepository, 'get'>;
};

export const useDialogueDisplayPreferences = ({
  userPreferencesRepo,
}: UseDialogueDisplayPreferencesInput): ChatDisplayPreferences => {
  const [preferences, setPreferences] =
    useState<ChatDisplayPreferences>(createDefaults());

  const load = useCallback(async () => {
    try {
      const userPreferences = await userPreferencesRepo.get();
      const messageFontSize = clamp(
        userPreferences.fontSize,
        MIN_FONT_SIZE,
        MAX_FONT_SIZE
      );

      setPreferences({
        userNodeViewStyle: userPreferences.nodeViewStyle,
        userNodeCornerRadius: clamp(
          userPreferences.nodeViewCornerRadius ?? DEFAULT_CORNER_RADIUS,
          0,
          MAX_CORNER_RADIUS
        ),
        messageFontSize,
        messageLineHeight: toMessageLineHeight(messageFontSize),
        messageFontFamily: normalizeFontFamily(userPreferences.fontFace),
      });
    } catch {
      // Keep existing preferences on load failure.
    }
  }, [userPreferencesRepo]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  return preferences;
};
