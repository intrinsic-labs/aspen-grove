import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { FontSize, NodeViewStyle } from '@domain/entities';
import { useAppServices } from '@interface/composition';
import type { ChatFontFace } from '../types';

const SUPPORTED_CHAT_FONT_FACES: readonly ChatFontFace[] = [
  'Cardo-Regular',
  'IBMPlexMono-Regular',
  'OpenSans-Regular',
];
const DEFAULT_CHAT_FONT_FACE: ChatFontFace = 'Cardo-Regular';
const MIN_CHAT_FONT_SIZE = 12;
const MAX_CHAT_FONT_SIZE = 30;
const MIN_NODE_CORNER_RADIUS = 0;
const MAX_NODE_CORNER_RADIUS = 32;

const toChatFontFace = (value?: string): ChatFontFace =>
  SUPPORTED_CHAT_FONT_FACES.includes(value as ChatFontFace)
    ? (value as ChatFontFace)
    : DEFAULT_CHAT_FONT_FACE;

type AppearanceDraft = {
  readonly fontFace: ChatFontFace;
  readonly fontSizeInput: string;
  readonly nodeViewStyle: NodeViewStyle;
  readonly nodeViewCornerRadiusInput: string;
  readonly verboseErrorAlerts: boolean;
  readonly autoTitleEnabled: boolean;
};

const toDraftKey = (draft: AppearanceDraft): string => JSON.stringify(draft);

/**
 * App-wide appearance and behavior preferences (typography, node styling,
 * verbose errors). These are genuinely global — they map 1:1 onto
 * UserPreferences and have nothing to do with agents or providers.
 */
export const useAppearanceController = () => {
  const { repositories } = useAppServices();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSavedDraftKeyRef = useRef<string | null>(null);

  const [fontFace, setFontFace] = useState<ChatFontFace>(
    DEFAULT_CHAT_FONT_FACE
  );
  const [fontSizeInput, setFontSizeInput] = useState('17');
  const [nodeViewStyle, setNodeViewStyle] = useState<NodeViewStyle>('filled');
  const [nodeViewCornerRadiusInput, setNodeViewCornerRadiusInput] =
    useState('8');
  const [verboseErrorAlerts, setVerboseErrorAlerts] = useState(false);
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userPreferences = await repositories.userPreferencesRepo.get();
      const draft: AppearanceDraft = {
        fontFace: toChatFontFace(userPreferences.fontFace),
        fontSizeInput: String(userPreferences.fontSize),
        nodeViewStyle: userPreferences.nodeViewStyle,
        nodeViewCornerRadiusInput: String(userPreferences.nodeViewCornerRadius),
        verboseErrorAlerts: userPreferences.verboseErrorAlerts,
        autoTitleEnabled: userPreferences.autoTitleEnabled,
      };

      setFontFace(draft.fontFace);
      setFontSizeInput(draft.fontSizeInput);
      setNodeViewStyle(draft.nodeViewStyle);
      setNodeViewCornerRadiusInput(draft.nodeViewCornerRadiusInput);
      setVerboseErrorAlerts(draft.verboseErrorAlerts);
      setAutoTitleEnabled(draft.autoTitleEnabled);

      lastSavedDraftKeyRef.current = toDraftKey(draft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [repositories.userPreferencesRepo]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
      return undefined;
    }, [loadSettings])
  );

  const persistDraft = useCallback(
    async (draft: AppearanceDraft): Promise<void> => {
      const parsedFontSize = Number(draft.fontSizeInput.trim());
      const parsedNodeCornerRadius = Number(
        draft.nodeViewCornerRadiusInput.trim()
      );

      if (!SUPPORTED_CHAT_FONT_FACES.includes(draft.fontFace)) {
        setError('Selected font is not supported.');
        return;
      }
      if (
        !Number.isInteger(parsedFontSize) ||
        parsedFontSize < MIN_CHAT_FONT_SIZE ||
        parsedFontSize > MAX_CHAT_FONT_SIZE
      ) {
        setError(
          `Font size must be a whole number between ${MIN_CHAT_FONT_SIZE} and ${MAX_CHAT_FONT_SIZE}.`
        );
        return;
      }
      if (
        !Number.isInteger(parsedNodeCornerRadius) ||
        parsedNodeCornerRadius < MIN_NODE_CORNER_RADIUS ||
        parsedNodeCornerRadius > MAX_NODE_CORNER_RADIUS
      ) {
        setError(
          `Message corner radius must be a whole number between ${MIN_NODE_CORNER_RADIUS} and ${MAX_NODE_CORNER_RADIUS}.`
        );
        return;
      }

      setSaving(true);
      setError(null);

      try {
        await repositories.userPreferencesRepo.update({
          fontFace: draft.fontFace,
          fontSize: parsedFontSize as FontSize,
          nodeViewStyle: draft.nodeViewStyle,
          nodeViewCornerRadius: parsedNodeCornerRadius,
          verboseErrorAlerts: draft.verboseErrorAlerts,
          autoTitleEnabled: draft.autoTitleEnabled,
        });

        lastSavedDraftKeyRef.current = toDraftKey(draft);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setSaving(false);
      }
    },
    [repositories.userPreferencesRepo]
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    const draft: AppearanceDraft = {
      fontFace,
      fontSizeInput,
      nodeViewStyle,
      nodeViewCornerRadiusInput,
      verboseErrorAlerts,
      autoTitleEnabled,
    };
    if (toDraftKey(draft) === lastSavedDraftKeyRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void persistDraft(draft);
    }, 450);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    fontFace,
    fontSizeInput,
    nodeViewStyle,
    nodeViewCornerRadiusInput,
    verboseErrorAlerts,
    autoTitleEnabled,
    loading,
    persistDraft,
  ]);

  return {
    loading,
    saving,
    error,

    fontFace,
    setFontFace,
    fontSizeInput,
    setFontSizeInput,
    nodeViewStyle,
    setNodeViewStyle,
    nodeViewCornerRadiusInput,
    setNodeViewCornerRadiusInput,
    verboseErrorAlerts,
    setVerboseErrorAlerts,
    autoTitleEnabled,
    setAutoTitleEnabled,
  };
};
