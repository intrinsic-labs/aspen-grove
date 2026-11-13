import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';

const CARDO = 'Cardo-Regular';
const { cardoSizeOffset, messageLineHeightRatio } = loomUiTokens.typography;

export type MessageType = {
  readonly fontSize: number;
  readonly lineHeight: number;
};

/**
 * The rendered size and line pitch of message text for a chosen size, as
 * Latent Spaces draws it: Cardo (the default face, `undefined` here) renders
 * larger than the setting (LoomFont.swift:39; see `cardoSizeOffset`), and
 * lines keep the font's natural leading.
 */
export const toMessageType = (
  chosenSize: number,
  fontFamily: string | undefined
): MessageType => {
  const fontSize =
    fontFamily === undefined || fontFamily === CARDO
      ? chosenSize + cardoSizeOffset
      : chosenSize;
  return {
    fontSize,
    lineHeight: fontSize * messageLineHeightRatio,
  };
};
