import type {
  EditorMessage,
  HostMessage,
} from '../../src/interface/components/buffer/android/web-editor-protocol';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(message: string): void };
  }
}

export const post = (message: EditorMessage): void =>
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));

/**
 * Host messages arrive on `document` on Android and on `window` on iOS.
 * Malformed input is dropped; the page keeps its document.
 */
export const listen = (handler: (message: HostMessage) => void): void => {
  const receive = (event: Event): void => {
    const data = (event as MessageEvent<unknown>).data;
    if (typeof data !== 'string') {
      return;
    }
    try {
      handler(JSON.parse(data) as HostMessage);
    } catch {
      // ignored
    }
  };
  document.addEventListener('message', receive);
  window.addEventListener('message', receive);
};
