import type { TextPromptRequest } from '@/interface/ui/components/text-prompt/text-prompt';

/**
 * The tree's rename alert (ToolbarMenu.swift:107-117): "Loom Tree Name", a
 * "Name" field, Cancel and Save. Home's Edit Name asks the same.
 */
export const treeNamePrompt = (title: string): TextPromptRequest => ({
  title: 'Loom Tree Name',
  initialValue: title,
  placeholder: 'Name',
});
