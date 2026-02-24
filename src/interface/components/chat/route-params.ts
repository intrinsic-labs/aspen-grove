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
};

export const toDialogueRouteParams = (params: {
  readonly treeId?: string | string[];
  readonly autofocus?: string | string[];
  readonly ephemeral?: string | string[];
}): DialogueRouteParams => ({
  treeIdParam: getParamString(params.treeId),
  shouldAutofocus: getParamString(params.autofocus) === '1',
  shouldDeleteEmptyOnBlur: getParamString(params.ephemeral) === '1',
});
