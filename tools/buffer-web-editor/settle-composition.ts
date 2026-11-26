type SettleView = {
  composing(): boolean;
  end(): void;
  flush(): Promise<void>;
  lock(): Promise<void>;
  current(): boolean;
};
/** Keep accepting IME replacements until the composition ends and its DOM edit is drained. */
export const settleComposition = async (view: SettleView): Promise<boolean> => {
  if (view.composing()) {
    const deadline = Date.now() + 600;
    view.end();
    while (view.composing()) {
      if (!view.current() || Date.now() >= deadline) return false;
      await new Promise<void>((resolve) => setTimeout(resolve, 16));
    }
  }
  if (!view.current()) return false;
  await view.flush();
  if (!view.current() || view.composing()) return false;
  await view.lock();
  if (!view.current()) return false;
  await view.flush();
  return view.current() && !view.composing();
};
