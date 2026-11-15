import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';
import { loomUiTokens } from '../../../ui/value-objects/loom-ui-tokens';
import { provenanceStatusLabel, shortHash } from './provenance-status-label';
import type { NodeSheetData } from './useNodeSheetData';

const sheet = loomUiTokens.nodeSheet;

const Row = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | undefined | null;
}) =>
  value ? (
    <View style={styles.row}>
      <AppText variant="meta" tone="secondary" style={styles.small}>
        {label}
      </AppText>
      <AppText variant="mono" style={[styles.small, styles.value]}>
        {value}
      </AppText>
    </View>
  ) : null;

const Block = ({
  label,
  testID,
  children,
}: {
  readonly label: string;
  readonly testID?: string;
  readonly children: ReactNode;
}) => (
  <View testID={testID} style={styles.block}>
    <AppText variant="meta" tone="secondary" style={styles.blockLabel}>
      {label}
    </AppText>
    {children}
  </View>
);

/**
 * What Aspen Grove knows about a node beyond its text, under it in the
 * sheet: metadata, how it was generated, and its provenance check. Latent
 * Spaces' sheets show the text alone.
 */
export const NodeSheetDetails = ({
  data,
}: {
  readonly data: NodeSheetData;
}) => {
  const { colors } = useAspenGroveTheme();
  const { generation, provenance } = data;
  const flags = [
    data.bookmarked ? 'bookmarked' : null,
    data.pruned ? 'pruned' : null,
    data.excluded ? 'excluded' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View testID="node-sheet-details" style={styles.details}>
      <View style={[styles.divider, { backgroundColor: colors.line }]} />
      <Block label="METADATA">
        <Row label="Local ID" value={data.localId} />
        <Row label="Author" value={data.authorType} />
        <Row label="Created" value={data.createdAt.toLocaleString()} />
        <Row label="Edited from" value={data.editedFrom} />
        <Row label="Flags" value={flags || undefined} />
        <Row label="Content hash" value={shortHash(data.contentHash)} />
      </Block>

      {generation ? (
        <Block label="GENERATION" testID="node-sheet-generation">
          <Row label="Provider" value={generation.provider} />
          <Row label="Model" value={generation.modelIdentifier} />
          <Row label="Request ID" value={generation.requestId} />
          <Row label="Latency" value={`${generation.latencyMs} ms`} />
          {generation.tokenUsage ? (
            <Row
              label="Tokens"
              value={
                `${generation.tokenUsage.promptTokens} prompt + ` +
                `${generation.tokenUsage.completionTokens} completion = ` +
                `${generation.tokenUsage.totalTokens}`
              }
            />
          ) : null}
        </Block>
      ) : null}

      {provenance ? (
        <Block label="PROVENANCE" testID="node-sheet-provenance">
          <AppText
            testID="node-sheet-provenance-status"
            variant="meta"
            style={[
              styles.status,
              { color: provenance.isValid ? colors.green : colors.red },
            ]}
          >
            {provenanceStatusLabel[provenance.status]}
          </AppText>
          <Row
            label="Parents in chain"
            value={
              provenance.parentNodeCount !== undefined
                ? String(provenance.parentNodeCount)
                : undefined
            }
          />
          <Row
            label="Raw response"
            value={
              provenance.rawApiResponseId
                ? shortHash(String(provenance.rawApiResponseId))
                : undefined
            }
          />
          <Row
            label="Raw response hash"
            value={
              provenance.rawResponseHash
                ? shortHash(String(provenance.rawResponseHash))
                : undefined
            }
          />
          {!provenance.isValid && provenance.expectedContentHash ? (
            <Row
              label="Expected hash"
              value={shortHash(String(provenance.expectedContentHash))}
            />
          ) : null}
        </Block>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  details: {
    gap: sheet.detailsGap,
    paddingHorizontal: sheet.textInset,
    paddingBottom: 40,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  block: {
    gap: sheet.detailsRowGap,
  },
  blockLabel: {
    fontSize: sheet.detailsTextSize,
    letterSpacing: sheet.detailsLabelSpacing,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  small: {
    fontSize: sheet.detailsTextSize,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
  status: {
    fontSize: 13,
  },
});
