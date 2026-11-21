import { useCallback, useEffect, useRef, useState } from 'react';

/** Too small to move a pixel, big enough for Yoga to see a new style. */
const MEASURE_NUDGE = 0.01;

/** The min-height offset for a given revision: alternates 0 and the nudge. */
export const remeasureNudge = (revision: number): number =>
  revision % 2 === 0 ? 0 : MEASURE_NUDGE;

/** True when the field's value changed without the user typing it. */
export const isSetText = (value: string, lastTyped: string): boolean =>
  value !== lastTyped;

/**
 * Re-measures a multiline `TextInput` after its value is set from code
 * (an edit loading its text, a send clearing it).
 *
 * React Native's Fabric text input measures its height from the text its
 * native view last reported, and records a value set from JS only after
 * that measurement (`BaseTextInputShadowNode`: `measureContent`, then
 * `updateStateIfNeeded` in `layout()`). The native view applies the new
 * text without reporting back, so nothing measures again: an edit's
 * two-line text sat in a one-line field until the user typed. A second
 * commit with a changed style makes Yoga measure the input again, now
 * against the recorded text, so this hook nudges `minHeight` once, by less
 * than a pixel, after each set.
 *
 * Call `noteTyped` from `onChangeText` so typing doesn't count as a set.
 */
export const useRemeasureOnSetText = (value: string) => {
  const lastTyped = useRef(value);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (isSetText(value, lastTyped.current)) {
      lastTyped.current = value;
      setRevision((current) => current + 1);
    }
  }, [value]);

  const noteTyped = useCallback((text: string) => {
    lastTyped.current = text;
  }, []);

  return { noteTyped, minHeightNudge: remeasureNudge(revision) };
};
