type ComposerSubmitState = {
  /** A send, regenerate, rewind or parallel run is in flight. */
  readonly generating: boolean;
  readonly loading: boolean;
  /** The tree has no usable model agent. */
  readonly needsAgent: boolean;
  /** The composer is saving an edit, which generates nothing. */
  readonly isEditing: boolean;
  readonly input: string;
};

/**
 * Whether the composer's Send (or Save, when editing) is enabled. Only a new
 * turn needs a model agent: saving an edit of a message creates a sibling
 * node and generates nothing, so it stays available without one.
 */
export const canSubmitComposer = ({
  generating,
  loading,
  needsAgent,
  isEditing,
  input,
}: ComposerSubmitState): boolean =>
  !generating &&
  !loading &&
  (isEditing || !needsAgent) &&
  input.trim().length > 0;
