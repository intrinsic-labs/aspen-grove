import { visibleContentBottom } from './list-insets';

export type RailCenteringInput = {
  /** The rail's top and height, in content coordinates. */
  readonly railTop: number;
  readonly railHeight: number;
  readonly headerHeight: number;
  readonly viewportHeight: number;
  readonly composerHeight: number;
  readonly contentHeight: number;
};

/**
 * The scroll offset that centers an opening continuation rail in the
 * readable area between the header and the composer, as Latent Spaces does
 * (`proxy.scrollTo(…, anchor: .center)`, LoomTreeContentView.swift:56). A
 * rail taller than that area aligns its top instead. The offset stays
 * within what the list can scroll.
 */
export const centeredRailOffset = ({
  railTop,
  railHeight,
  headerHeight,
  viewportHeight,
  composerHeight,
  contentHeight,
}: RailCenteringInput): number => {
  const readableBottom = visibleContentBottom(
    0,
    viewportHeight,
    composerHeight
  );
  const readableHeight = readableBottom - headerHeight;
  const target =
    railHeight >= readableHeight
      ? railTop - headerHeight
      : railTop + railHeight / 2 - (headerHeight + readableHeight / 2);
  const maxOffset = Math.max(0, contentHeight - viewportHeight);
  return Math.min(maxOffset, Math.max(0, target));
};
