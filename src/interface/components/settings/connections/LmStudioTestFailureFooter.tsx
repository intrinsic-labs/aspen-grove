import { fonts } from '@interface/ui/value-objects/fonts';
import { StyleSheet, Text } from 'react-native';
import { formText } from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';
import { useErrorDetailDisclosure } from '../../error-details';

type LmStudioTestFailureFooterProps = {
  /** The plain line, in red. */
  readonly message: string;
  /** What the server or the network actually said, for diagnosing. */
  readonly detail?: string;
  /** "Verbose Error Alerts": the detail shows from the start. */
  readonly expandedByDefault: boolean;
};

/**
 * A failed connection test in the LM Studio section's footer: the plain
 * line, then the technical detail (secondary, selectable) and a "Show
 * Details" / "Hide Details" link when there is one. Key it by the failure so
 * a new failure starts from the default again.
 */
export const LmStudioTestFailureFooter = ({
  message,
  detail,
  expandedByDefault,
}: LmStudioTestFailureFooterProps) => {
  const { shown, toggle } = useErrorDetailDisclosure(expandedByDefault);
  return (
    <>
      <Text
        testID="connections-lmstudio-error"
        style={[formText.footer, styles.error]}
      >
        {message}
      </Text>
      {detail && shown ? (
        <Text
          testID="connections-lmstudio-error-detail"
          selectable
          style={[formText.footer, styles.detail]}
        >
          {detail}
        </Text>
      ) : null}
      {detail ? (
        <Text
          testID="connections-lmstudio-error-details-toggle"
          accessibilityRole="button"
          onPress={toggle}
          suppressHighlighting
          style={[formText.footer, styles.toggle]}
        >
          {shown ? 'Hide Details' : 'Show Details'}
        </Text>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  error: {
    color: loomUiTokens.colors.destructive,
  },
  detail: {
    fontFamily: fonts.mono,
    marginTop: 4,
  },
  toggle: {
    color: loomUiTokens.colors.accentColor,
    marginTop: 4,
  },
});
