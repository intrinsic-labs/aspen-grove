import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';
import { AppText } from '@/interface/ui/value-objects';
import { AGENT_TEMPLATES, type AgentTemplate } from './agent-templates';

type AgentTemplateListProps = {
  readonly onSelect: (template: AgentTemplate) => void;
  /** Marks one template as chosen (onboarding). */
  readonly selectedKey?: string | null;
  /** Rows get `<testIDPrefix>-<template key>`. */
  readonly testIDPrefix: string;
};

/**
 * The agent templates as one full-width row each: name, then model id and
 * temperature. Rows line up the same way whatever the label length.
 */
export const AgentTemplateList = ({
  onSelect,
  selectedKey = null,
  testIDPrefix,
}: AgentTemplateListProps) => {
  const { colors } = useAspenGroveTheme();

  return (
    <View>
      {AGENT_TEMPLATES.map((template, index) => {
        const selected = template.key === selectedKey;
        return (
          <Pressable
            key={template.key}
            testID={`${testIDPrefix}-${template.key}`}
            onPress={() => onSelect(template)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.row,
              index > 0 && {
                borderTopColor: colors.line,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
              { opacity: pressed ? 0.65 : 1 },
            ]}
          >
            <View style={styles.text}>
              <AppText
                variant="meta"
                style={{ color: selected ? colors.accentColor : colors.primary }}
              >
                {template.label}
              </AppText>
              <AppText
                variant="meta"
                tone="secondary"
                numberOfLines={1}
                style={styles.detail}
              >
                {template.draft.modelIdentifier} · temp{' '}
                {template.draft.temperatureInput}
              </AppText>
            </View>
            {selected ? (
              <Ionicons name="checkmark" size={16} color={colors.accentColor} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  detail: {
    fontSize: 11,
    lineHeight: 16,
  },
});
