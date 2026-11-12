const getParamString = (
  value: string | string[] | undefined
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export type DialogueRouteParams = {
  readonly treeIdParam?: string;
  readonly shouldAutofocus: boolean;
  readonly shouldDeleteEmptyOnBlur: boolean;
  /** A node whose Node Info sheet opens once the tree loads (from Search). */
  readonly nodeSheetId?: string;
};

export const toDialogueRouteParams = (params: {
  readonly treeId?: string | string[];
  readonly autofocus?: string | string[];
  readonly ephemeral?: string | string[];
  readonly nodeSheetId?: string | string[];
}): DialogueRouteParams => ({
  treeIdParam: getParamString(params.treeId),
  shouldAutofocus: getParamString(params.autofocus) === '1',
  shouldDeleteEmptyOnBlur: getParamString(params.ephemeral) === '1',
  nodeSheetId: getParamString(params.nodeSheetId),
});
