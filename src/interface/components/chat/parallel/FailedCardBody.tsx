import { StyleSheet, type TextStyle } from 'react-native';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';
import { continuationCardStyles } from '../continuation-card-styles';

const rail = loomUiTokens.continuationRail;

type FailedCardBodyProps = {
  readonly slot: number;
  /** The plain line, in the card's own text style. */
  readonly message: string;
  /** The provider's own words; the card offers them only when there are some. */
  readonly detail?: string;
  readonly showDetail: boolean;
  readonly textStyle: TextStyle;
};

/**
 * What a failed continuation card holds: a plain line in the card's usual
 * text, then either a quiet "Tap for details." or, once tapped, the
 * technical detail in the meta font (selectable, to copy into a bug report).
 */
export const FailedCardBody = ({
  slot,
  message,
  detail,
  showDetail,
  textStyle,
}: FailedCardBodyProps) => (
  <>
    <AppText
      testID={`chat-continuation-slot-error-${slot}`}
      variant="body"
      numberOfLines={rail.previewTextMaxLines}
      style={[textStyle, continuationCardStyles.cardText]}
    >
      {message}
    </AppText>
    {detail && showDetail ? (
      <AppText
        testID={`chat-continuation-slot-error-detail-${slot}`}
        variant="meta"
        selectable
        style={[continuationCardStyles.cardText, styles.detail]}
      >
        {detail}
      </AppText>
    ) : null}
    {detail ? (
      <AppText
        variant="meta"
        style={[
          continuationCardStyles.cardText,
          continuationCardStyles.quietText,
          styles.hint,
        ]}
      >
        {showDetail ? 'Tap to hide details.' : 'Tap for details.'}
      </AppText>
    ) : null}
  </>
);

const styles = StyleSheet.create({
  detail: {
    marginTop: 6,
  },
  hint: {
    marginTop: 6,
  },
});
