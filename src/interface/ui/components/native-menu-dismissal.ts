/**
 * Work that must wait for a native context menu to finish closing.
 *
 * A menu's action arrives while the menu is still animating away. On iOS,
 * UIKit hands first responder back to whatever held it before the menu
 * opened once the dismissal ends, so a text input focused from the action
 * loses focus again when the keyboard was down. Android's menu popup holds
 * window focus until it closes, so the keyboard can't show before then
 * either. Menus report when they appear and when they have gone
 * (`onMenuShow`, `onMenuDismiss`, added by
 * `patches/react-native-context-menu-view+1.21.0.patch`); `afterDismiss`
 * runs its work then, or straight away when no menu is open.
 *
 * `fallbackMs` only guards against a dismissal that is never reported (the
 * menu's view unmounted mid-animation): queued work then runs anyway.
 */
export type MenuDismissal = {
  readonly menuDidShow: () => void;
  readonly menuDidDismiss: () => void;
  readonly afterDismiss: (run: () => void) => void;
};

type Timers = {
  readonly setTimeout: (run: () => void, ms: number) => unknown;
  readonly clearTimeout: (handle: unknown) => void;
};

export const createMenuDismissal = ({
  fallbackMs,
  timers,
}: {
  readonly fallbackMs: number;
  readonly timers: Timers;
}): MenuDismissal => {
  let open = false;
  let queued: (() => void)[] = [];
  let fallback: unknown = null;

  const flush = () => {
    open = false;
    if (fallback !== null) {
      timers.clearTimeout(fallback);
      fallback = null;
    }
    const runs = queued;
    queued = [];
    runs.forEach((run) => run());
  };

  return {
    menuDidShow: () => {
      open = true;
    },
    menuDidDismiss: flush,
    afterDismiss: (run) => {
      if (!open) {
        run();
        return;
      }
      queued.push(run);
      if (fallback === null) {
        fallback = timers.setTimeout(flush, fallbackMs);
      }
    },
  };
};

/** One per app: only one native menu is ever open at a time. */
export const nativeMenuDismissal = createMenuDismissal({
  fallbackMs: 1000,
  timers: {
    setTimeout: (run, ms) => setTimeout(run, ms),
    clearTimeout: (handle) =>
      clearTimeout(handle as ReturnType<typeof setTimeout>),
  },
});

/** The props a `ContextMenu` passes on so `afterDismiss` knows it is open. */
export const nativeMenuDismissalProps = {
  onMenuShow: nativeMenuDismissal.menuDidShow,
  onMenuDismiss: nativeMenuDismissal.menuDidDismiss,
} as const;
