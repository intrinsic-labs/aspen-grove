/**
 * The developer-preview switch for buffer mode: `EXPO_PUBLIC_BUFFER_PREVIEW=1`
 * in the environment of the Metro process that bundles the app. While it is
 * off, nothing about buffer mode is reachable and every tree opens as before.
 *
 * Read as the literal `process.env.EXPO_PUBLIC_BUFFER_PREVIEW`: Expo inlines
 * only that exact form. A function, so tests can toggle it. Phase 9 deletes
 * this file along with the gate.
 */
export const isBufferPreviewEnabled = (): boolean =>
  process.env.EXPO_PUBLIC_BUFFER_PREVIEW === '1';
