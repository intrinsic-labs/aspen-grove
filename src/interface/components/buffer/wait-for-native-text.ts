import { editorUnavailable } from './composition-barrier';

/** UIKit supplies the target. A frame only rechecks delivery, it never confirms it. */
export const waitForNativeText = (
  snapshot: Promise<string | null>,
  applied: () => string,
  listener: { current: (() => void) | null }
): Promise<void> => {
  let active = true;
  let frame: number | undefined;
  let timer: ReturnType<typeof setTimeout>;
  let check: (() => void) | undefined;
  return new Promise<void>((resolve, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            'The editor timed out while confirming your last edit. Try again.'
          )
        ),
      1500
    );
    snapshot
      .then((target) => {
        if (!active) return;
        if (target === null) return editorUnavailable();
        check = () => {
          if (applied() === target) resolve();
        };
        listener.current = check;
        const poll = () => {
          if (applied() === target) resolve();
          else frame = requestAnimationFrame(poll);
        };
        poll();
      })
      .catch(reject);
  }).finally(() => {
    active = false;
    clearTimeout(timer);
    if (frame !== undefined) cancelAnimationFrame(frame);
    if (listener.current === check) listener.current = null;
  });
};
