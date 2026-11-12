import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { IUserPreferencesRepository } from '@application/repositories';
import { sameDisplayPreferences } from './display-preferences-equality';
import { toMessageType } from './message-type';
import type { ChatDisplayPreferences } from './types';
import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';

// LoomApp.swift:33
const DEFAULT_FONT_SIZE = loomUiTokens.typography.defaultMessageFontSize;
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

const normalizeFontFamily = (fontFace?: string): string | undefined => {
  if (!fontFace) {
    return undefined;
  }
  const normalized = fontFace.trim();
  return SUPPORTED_FONT_FAMILIES.has(normalized) ? normalized : undefined;
};

const createDefaults = (): ChatDisplayPreferences => {
  const type = toMessageType(DEFAULT_FONT_SIZE, undefined);
  return {
    userNodeViewStyle: 'filled',
    userNodeCornerRadius: DEFAULT_CORNER_RADIUS,
    messageFontSize: type.fontSize,
    messageLineHeight: type.lineHeight,
    messageFontFamily: undefined,
  };
};

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
      const messageFontFamily = normalizeFontFamily(userPreferences.fontFace);
      const type = toMessageType(
        clamp(userPreferences.fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE),
        messageFontFamily
      );

      const next: ChatDisplayPreferences = {
        userNodeViewStyle: userPreferences.nodeViewStyle,
        userNodeCornerRadius: clamp(
          userPreferences.nodeViewCornerRadius ?? DEFAULT_CORNER_RADIUS,
          0,
          MAX_CORNER_RADIUS
        ),
        messageFontSize: type.fontSize,
        messageLineHeight: type.lineHeight,
        messageFontFamily,
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
