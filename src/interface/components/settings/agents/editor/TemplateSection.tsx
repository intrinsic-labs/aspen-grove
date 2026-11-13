import { FormSection } from '@/interface/ui/components/form';
import { AGENT_TEMPLATES, type AgentTemplate } from '../agent-templates';
import { FormCheckRow } from './FormCheckRow';

type TemplateSectionProps = {
  readonly selectedKey: string | null;
  readonly onSelect: (template: AgentTemplate) => void;
};

/** Quick-start templates as an inline picker (create mode only). */
export const TemplateSection = ({
  selectedKey,
  onSelect,
}: TemplateSectionProps) => (
  <FormSection testID="agent-editor-templates" header="Start from a Template">
    {AGENT_TEMPLATES.map((template) => (
      <FormCheckRow
        key={template.key}
        testID={`agent-editor-template-${template.key}`}
        title={template.label}
        detail={`${template.draft.modelIdentifier} · temp ${template.draft.temperatureInput}`}
        selected={template.key === selectedKey}
        onPress={() => onSelect(template)}
      />
    ))}
  </FormSection>
);
