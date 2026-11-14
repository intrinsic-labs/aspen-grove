import { FormSection } from '@/interface/ui/components/form';
import { AGENT_TEMPLATES, type AgentTemplate } from '../agent-templates';
import { FormCheckRow } from './FormCheckRow';

type TemplateSectionProps = {
  readonly selectedKey: string | null;
  readonly onSelect: (template: AgentTemplate) => void;
  readonly header?: string;
  /** The section is `<prefix>s`, its rows `<prefix>-<template key>`. */
  readonly testIDPrefix?: string;
};

/**
 * Quick-start templates as an inline picker: the agent editor's create mode,
 * and onboarding's model choice.
 */
export const TemplateSection = ({
  selectedKey,
  onSelect,
  header = 'Start from a Template',
  testIDPrefix = 'agent-editor-template',
}: TemplateSectionProps) => (
  <FormSection testID={`${testIDPrefix}s`} header={header}>
    {AGENT_TEMPLATES.map((template) => (
      <FormCheckRow
        key={template.key}
        testID={`${testIDPrefix}-${template.key}`}
        title={template.label}
        detail={`${template.draft.modelIdentifier} · temp ${template.draft.temperatureInput}`}
        selected={template.key === selectedKey}
        onPress={() => onSelect(template)}
      />
    ))}
  </FormSection>
);
