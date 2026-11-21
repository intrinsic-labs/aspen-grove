import { createMenuDismissal } from './native-menu-dismissal';

const fakeTimers = () => {
  const pending = new Map<number, () => void>();
  let next = 1;
  return {
    pending,
    timers: {
      setTimeout: (run: () => void) => {
        const id = next++;
        pending.set(id, run);
        return id;
      },
      clearTimeout: (handle: unknown) => {
        pending.delete(handle as number);
      },
    },
    fire: () => {
      const runs = [...pending.values()];
      pending.clear();
      runs.forEach((run) => run());
    },
  };
};

describe('createMenuDismissal', () => {
  it('runs straight away when no menu is open', () => {
    const { timers } = fakeTimers();
    const dismissal = createMenuDismissal({ fallbackMs: 1000, timers });
    const run = jest.fn();

    dismissal.afterDismiss(run);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('waits for an open menu to be dismissed, then runs once', () => {
    const clock = fakeTimers();
    const dismissal = createMenuDismissal({
      fallbackMs: 1000,
      timers: clock.timers,
    });
    const run = jest.fn();

    dismissal.menuDidShow();
    dismissal.afterDismiss(run);
    expect(run).not.toHaveBeenCalled();

    dismissal.menuDidDismiss();
    expect(run).toHaveBeenCalledTimes(1);
    expect(clock.pending.size).toBe(0);

    dismissal.menuDidDismiss();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs at once when the dismissal came before the work', () => {
    const { timers } = fakeTimers();
    const dismissal = createMenuDismissal({ fallbackMs: 1000, timers });
    const run = jest.fn();

    dismissal.menuDidShow();
    dismissal.menuDidDismiss();
    dismissal.afterDismiss(run);

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs queued work anyway when no dismissal is ever reported', () => {
    const clock = fakeTimers();
    const dismissal = createMenuDismissal({
      fallbackMs: 1000,
      timers: clock.timers,
    });
    const run = jest.fn();

    dismissal.menuDidShow();
    dismissal.afterDismiss(run);
    clock.fire();

    expect(run).toHaveBeenCalledTimes(1);
    const later = jest.fn();
    dismissal.afterDismiss(later);
    expect(later).toHaveBeenCalledTimes(1);
  });
});
