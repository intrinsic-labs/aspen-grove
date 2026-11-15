import { useMemo } from 'react';

let issued = 0;

/**
 * An `inputAccessoryViewID` / `KeyboardDoneBar` `nativeID`, fresh each time
 * the fields it serves mount: on each mount of the caller and each time
 * `fieldsShown` turns true (a sheet that stays mounted while its modal
 * opens and closes passes its visibility).
 *
 * React Native 0.86 (iOS, New Architecture) clears a recycled TextInput's
 * accessory ID but still diffs new props against its last ones, so a field
 * remounted with the ID it had before is never given it again and the Done
 * bar can't find it. A new ID always differs.
 */
export const useKeyboardAccessoryId = (
  name: string,
  fieldsShown = true
): string =>
  useMemo(
    () => (fieldsShown ? `${name}-${(issued += 1)}` : name),
    [name, fieldsShown]
  );
