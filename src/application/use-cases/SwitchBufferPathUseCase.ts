import type { BufferSwitchAction } from '@application/services/buffer/buffer-draft';
import type { ResolvedBufferPath } from '@application/services/buffer/resolve-buffer-path';
import type {
  BufferCommandInput,
  BufferCommands,
} from './CommitBufferChangesUseCase';

const sameSwitch = (a: BufferSwitchAction, b: BufferSwitchAction): boolean =>
  a.kind === b.kind && a.position === b.position && a.nodeId === b.nodeId;

/**
 * Folds the draft and a version or branch switch into one command. The
 * caller persists the draft with `action` set before calling, so a lost
 * acknowledgement replays the same switch from the recovery draft.
 */
export class SwitchBufferPathUseCase {
  constructor(private readonly commands: BufferCommands) {}
  execute(
    input: BufferCommandInput & { readonly action: BufferSwitchAction }
  ): Promise<ResolvedBufferPath> {
    const { action, draft } = input;
    if (draft.action && !sameSwitch(draft.action, action))
      throw new Error('Buffer draft carries a different switch');
    return this.commands.execute({ ...input, draft: { ...draft, action } });
  }
}
