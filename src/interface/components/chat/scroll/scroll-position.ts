/** Within this many points of the end counts as "at the bottom". */
export const NEAR_BOTTOM_THRESHOLD = 48;

export type ScrollMetrics = {
  readonly layoutMeasurement: { readonly height: number };
  readonly contentOffset: { readonly y: number };
  readonly contentSize: { readonly height: number };
};

/** Whether a scroll view is close enough to its end to keep following. */
export const isNearBottom = ({
  layoutMeasurement,
  contentOffset,
  contentSize,
}: ScrollMetrics): boolean =>
  contentSize.height - (contentOffset.y + layoutMeasurement.height) <=
  NEAR_BOTTOM_THRESHOLD;
