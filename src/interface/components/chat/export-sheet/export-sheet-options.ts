import type { ExportOpenLoomOptions } from '@application/services/open-loom';

/** What the Export Loom Tree sheet edits (OpenLoomExportSheet.swift:7-10). */
export type ExportSheetDraft = {
  readonly title: string;
  readonly description: string;
  readonly includeSystemMessage: boolean;
  readonly includeBookmarks: boolean;
};

export const initialExportDraft = (tree: {
  readonly title: string;
  readonly description?: string;
}): ExportSheetDraft => ({
  title: tree.title,
  description: tree.description ?? '',
  includeSystemMessage: true,
  includeBookmarks: true,
});

/**
 * The export's options from the sheet. An empty description leaves it out,
 * as Latent Spaces does. Latent Spaces' system message is Aspen Grove's
 * tree system context together with the agents' system prompts and the
 * text of any system-authored node (an imported tree's system message can
 * sit in the tree as one), so the one toggle drops all three.
 */
export const toExportOptions = (
  draft: ExportSheetDraft
): ExportOpenLoomOptions => ({
  title: draft.title,
  description: draft.description.length > 0 ? draft.description : null,
  includeSystemContext: draft.includeSystemMessage,
  includeAgentSystemPrompts: draft.includeSystemMessage,
  includeSystemNodeContent: draft.includeSystemMessage,
  includeBookmarks: draft.includeBookmarks,
});
