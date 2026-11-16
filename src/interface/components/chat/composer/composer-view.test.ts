import type { ULID } from '@domain/value-objects';
import { toComposerView } from './composer-view';

const base = {
  editTarget: null,
  agentName: 'Claude',
  generating: false,
  loading: false,
  needsAgent: false,
  input: 'hello',
  stopGeneration: { stoppable: false, stopping: false, stop: () => {} },
  cancelEdit: () => {},
};

describe('toComposerView', () => {
  it('addresses the agent and enables Send for a new message', () => {
    const view = toComposerView(base);
    expect(view.composerPlaceholder).toBe('Reply to Claude');
    expect(view.sendLabel).toBe('Send');
    expect(view.isEditing).toBe(false);
    expect(view.canSend).toBe(true);
  });

  it('blocks a new message without an agent but still saves an edit', () => {
    expect(toComposerView({ ...base, needsAgent: true }).canSend).toBe(false);
    const editing = toComposerView({
      ...base,
      needsAgent: true,
      editTarget: { nodeId: '01J' as ULID, localId: 'ab12' },
    });
    expect(editing.canSend).toBe(true);
    expect(editing.editLabel).toBe('Editing ab12');
    expect(editing.sendLabel).toBe('Save');
  });

  it('passes the stop state through and blocks Send while generating', () => {
    const stop = jest.fn();
    const view = toComposerView({
      ...base,
      generating: true,
      stopGeneration: { stoppable: true, stopping: false, stop },
    });
    expect(view.canSend).toBe(false);
    expect(view.canStop).toBe(true);
    view.onStop();
    expect(stop).toHaveBeenCalled();
  });
});
