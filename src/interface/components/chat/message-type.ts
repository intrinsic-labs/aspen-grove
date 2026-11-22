import { fonts } from '@interface/ui/value-objects/fonts';
import { loomUiTokens } from '@interface/ui/value-objects/loom-ui-tokens';

const {
  cardoSizeOffset,
  vt220SizeOffset,
  vt220LineHeightRatio,
  messageLineHeightRatio,
} = loomUiTokens.typography;

export type MessageType = {
  readonly fontSize: number;
  readonly lineHeight: number;
};

/**
 * The rendered size and line pitch of message text for a chosen size, as
 * Latent Spaces draws it: Cardo (the default face, `undefined` here) renders
 * larger than the setting (LoomFont.swift:39; see `cardoSizeOffset`), and
 * VT220 renders two points larger with loose leading.
 */
export const toMessageType = (
  chosenSize: number,
  fontFamily: string | undefined
): MessageType => {
  const fontSize =
    fontFamily === undefined || fontFamily === fonts.cardoRegular
      ? chosenSize + cardoSizeOffset
      : fontFamily === fonts.vt220
        ? chosenSize + vt220SizeOffset
        : chosenSize;
  return {
    fontSize,
    lineHeight:
      fontSize *
      (fontFamily === fonts.vt220
        ? vt220LineHeightRatio
        : messageLineHeightRatio),
  };
};
