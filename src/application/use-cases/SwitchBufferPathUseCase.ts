import type {
  BufferPathAction,
  ResolvedBufferPath,
} from '@application/services/buffer/resolve-buffer-path';
import type {
  BufferCommandInput,
  BufferCommands,
} from './CommitBufferChangesUseCase';

export class SwitchBufferPathUseCase {
  constructor(private readonly commands: BufferCommands) {}
  execute(
    input: BufferCommandInput & {
      action: Exclude<BufferPathAction, { kind: 'open' }>;
    }
  ): Promise<ResolvedBufferPath> {
    return this.commands.execute(input, input.action);
  }
}
