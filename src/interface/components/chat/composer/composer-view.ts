import { canSubmitComposer } from './can-submit-composer';
import { toComposerMode, type EditTarget } from './composer-mode';

type ComposerViewInput = {
  readonly editTarget: EditTarget | null;
  /** The tree's agent, addressed by the placeholder. */
  readonly agentName: string | undefined;
  /** A send, regenerate, rewind or parallel run is in flight. */
  readonly generating: boolean;
  readonly loading: boolean;
  /** The tree has no usable model agent. */
  readonly needsAgent: boolean;
  readonly input: string;
  readonly stopGeneration: {
    readonly stoppable: boolean;
    readonly stopping: boolean;
    readonly stop: () => void;
  };
  /** Leaves edit mode and clears the field. */
  readonly cancelEdit: () => void;
};

/**
 * The composer's props: its copy for sending or editing, whether Send is
 * enabled, and Stop for a streaming send or regenerate.
 */
export const toComposerView = ({
  editTarget,
  agentName,
  generating,
  loading,
  needsAgent,
  input,
  stopGeneration,
  cancelEdit,
}: ComposerViewInput) => {
  const mode = toComposerMode(editTarget, agentName);
  return {
    // A send or regenerate is streaming and can be stopped from the composer.
    canStop: stopGeneration.stoppable,
    stopping: stopGeneration.stopping,
    onStop: stopGeneration.stop,
    onCancelEdit: cancelEdit,
    isEditing: mode.isEditing,
    editLabel: mode.editLabel,
    canSend: canSubmitComposer({
      generating,
      loading,
      needsAgent,
      isEditing: mode.isEditing,
      input,
    }),
    needsAgent,
    composerPlaceholder: mode.composerPlaceholder,
    sendLabel: mode.sendLabel,
  };
};
