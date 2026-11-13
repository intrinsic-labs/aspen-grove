import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  FormRow,
  formText,
  useFormColors,
} from '@/interface/ui/components/form';
import { loomUiTokens } from '@/interface/ui/value-objects/loom-ui-tokens';

const form = loomUiTokens.settingsForm;
const browser = loomUiTokens.modelBrowser;

export type ModelBrowserRowProps = {
  readonly id: string;
  /** The model's own name. */
  readonly title: string;
  /** Who made it. */
  readonly author?: string;
  /** Context and price, in mono. */
  readonly meta?: string;
  readonly selected: boolean;
  readonly first: boolean;
  readonly last: boolean;
  readonly onOpen: (id: string) => void;
  readonly testID: string;
};

/**
 * One model in the browser's list: its name, who made it, then context and
 * price in mono; a gold check on the chosen one and a chevron, since a tap
 * opens the model's page. The list is one inset card cut into rows (first
 * and last round its corners).
 */
export const ModelBrowserRow = memo(function ModelBrowserRow({
  id,
  title,
  author,
  meta,
  selected,
  first,
  last,
  onOpen,
  testID,
}: ModelBrowserRowProps) {
  const colors = useFormColors();
  return (
    <View
      style={[
        { backgroundColor: colors.card },
        first ? styles.first : null,
        last ? styles.last : null,
      ]}
    >
      <FormRow
        testID={testID}
        onPress={() => onOpen(id)}
        accessibilityLabel={author ? `${title}, by ${author}` : title}
        style={styles.row}
      >
        <View style={styles.text}>
          <Text numberOfLines={1} style={formText.body}>
            {title}
          </Text>
          {author ? (
            <Text numberOfLines={1} style={[formText.value, styles.author]}>
              {author}
            </Text>
          ) : null}
          {meta ? (
            <Text
              numberOfLines={1}
              style={[styles.meta, { color: colors.secondaryLabel }]}
            >
              {meta}
            </Text>
          ) : null}
        </View>
        {selected ? (
          <Ionicons
            name="checkmark"
            size={20}
            color={loomUiTokens.colors.accentColor}
          />
        ) : null}
        <Ionicons
          name="chevron-forward"
          size={form.linkChevronSize}
          color={form.colors.tertiaryLabel}
        />
      </FormRow>
      {last ? null : (
        <View
          style={[styles.separator, { backgroundColor: colors.separator }]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  first: {
    borderTopLeftRadius: form.cardRadius,
    borderTopRightRadius: form.cardRadius,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  last: {
    borderBottomLeftRadius: form.cardRadius,
    borderBottomRightRadius: form.cardRadius,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    paddingVertical: browser.rowVerticalPadding,
  },
  text: {
    flex: 1,
    gap: browser.rowLineGap,
  },
  author: {
    fontSize: browser.authorSize,
    lineHeight: browser.authorLineHeight,
  },
  meta: {
    fontFamily: browser.metaFontFamily,
    fontSize: browser.metaSize,
    lineHeight: browser.metaLineHeight,
  },
  separator: {
    height: 1,
    marginLeft: form.rowPaddingHorizontal,
  },
});
