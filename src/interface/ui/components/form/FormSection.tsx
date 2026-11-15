import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { loomUiTokens } from '../../value-objects/loom-ui-tokens';
import { useFormColors } from './form-context';
import { formText } from './form-text';

const form = loomUiTokens.settingsForm;

type FormSectionProps = {
  /** Sentence-case header above the card (SwiftUI `Section { } header:`). */
  readonly header?: string;
  /** Caption under the card: a string, or your own nodes. */
  readonly footer?: ReactNode;
  /** Rows. Each gets a separator below it except the last. */
  readonly children?: ReactNode;
  /** No card: rows sit straight on the page (`.listRowBackground(.clear)`). */
  readonly plain?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  /** Forwarded to the section's host View. */
  readonly testID?: string;
};

/**
 * A row's separator starts where its content starts: after the icon column
 * for a row with an icon, else at the row inset (iOS 26 inset-grouped).
 */
const separatorInsetOf = (child: ReactNode): number =>
  isValidElement<{ icon?: unknown; separatorInset?: 'icon' }>(child) &&
  (child.props.icon !== undefined || child.props.separatorInset === 'icon')
    ? form.rowPaddingHorizontal + form.labelIconColumn
    : form.rowPaddingHorizontal;

/**
 * One section of a Latent Spaces settings Form: an optional header, the
 * rounded card of rows with inset separators, and an optional footer.
 */
export const FormSection = ({
  header,
  footer,
  children,
  plain = false,
  style,
  testID,
}: FormSectionProps) => {
  const colors = useFormColors();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View
      testID={testID}
      style={[header ? styles.withHeader : styles.withoutHeader, style]}
    >
      {header ? (
        <Text style={[formText.header, styles.header]}>{header}</Text>
      ) : null}
      {rows.length > 0 ? (
        <View
          style={plain ? null : [styles.card, { backgroundColor: colors.card }]}
        >
          {rows.map((row, index) => (
            <Fragment key={index}>
              {row}
              {!plain && index < rows.length - 1 ? (
                <View
                  style={[
                    styles.separator,
                    {
                      marginLeft: separatorInsetOf(row),
                      backgroundColor: colors.separator,
                    },
                  ]}
                />
              ) : null}
            </Fragment>
          ))}
        </View>
      ) : null}
      {typeof footer === 'string' ? (
        <Text style={[formText.footer, styles.footer]}>{footer}</Text>
      ) : footer ? (
        <View style={styles.footer}>{footer}</View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  withHeader: {
    marginTop: form.headerTopGap,
  },
  withoutHeader: {
    marginTop: form.sectionGap,
  },
  header: {
    paddingHorizontal: form.rowPaddingHorizontal,
    marginBottom: form.headerBottomGap,
  },
  card: {
    borderRadius: form.cardRadius,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    marginRight: form.rowPaddingHorizontal,
  },
  footer: {
    paddingHorizontal: form.rowPaddingHorizontal,
    marginTop: form.footerTopGap,
    marginBottom: -12,
    gap: 12,
  },
});
