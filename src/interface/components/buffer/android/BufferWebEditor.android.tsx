import { memo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation,
} from 'react-native-webview';
import { bufferTokens } from '@/interface/ui/value-objects/tokens/buffer';
import type { BufferWebEditorProps } from './buffer-web-editor-props';
import { BUFFER_WEB_EDITOR_HTML } from './web-editor-html.generated';
import {
  encodeHostMessage,
  modelRangesOf,
  parseEditorMessage,
  replacementsToEdits,
} from './web-editor-protocol';
import { webEditorStyle } from './web-editor-style';

/** The page is loaded from this base so its fonts come from the app's assets. */
const BASE_URL = 'file:///android_asset/';
const SOURCE = { html: BUFFER_WEB_EDITOR_HTML, baseUrl: BASE_URL } as const;
const ORIGINS = ['*'];

/** Only the bundled page itself; a link in user text can never navigate. */
const allowNavigation = (request: WebViewNavigation): boolean =>
  request.url === BASE_URL || request.url === 'about:blank';

/**
 * The Android writing surface: one CodeMirror 6 editor in a WebView. It loads
 * a document per epoch (the text and its author ranges cross the bridge once)
 * and answers with the replacements the user typed; nothing else crosses
 * while typing, and the page is never handed text back. The component is
 * memoized on `epoch` and styling, so a host re-render per keystroke does not
 * reach the WebView. Style is sent with each load; a later style change
 * takes effect at the next one.
 */
const Editor = ({
  epoch,
  text,
  runs,
  textStyle,
  headerHeight,
  topGap,
  placeholder = '',
  onReplace,
}: BufferWebEditorProps) => {
  const webView = useRef<WebView>(null);
  const ready = useRef(false);
  const latest = useRef({ epoch, text, runs });
  latest.current = { epoch, text, runs };
  const style = useRef(webEditorStyle(textStyle, headerHeight, topGap, placeholder));
  style.current = webEditorStyle(textStyle, headerHeight, topGap, placeholder);

  const load = useCallback(() => {
    const document = latest.current;
    webView.current?.postMessage(
      encodeHostMessage({
        type: 'load',
        epoch: document.epoch,
        text: document.text,
        modelRanges: modelRangesOf(document.runs),
        style: style.current,
      })
    );
  }, []);

  useEffect(() => {
    if (ready.current) {
      load();
    }
  }, [epoch, load]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseEditorMessage(event.nativeEvent.data);
      if (message?.type === 'ready') {
        ready.current = true;
        load();
      } else if (message?.type === 'changes' && message.epoch === epoch) {
        replacementsToEdits(message.replacements).forEach(onReplace);
      }
    },
    [epoch, load, onReplace]
  );

  return (
    <WebView
      ref={webView}
      testID="buffer-web-editor"
      source={SOURCE}
      originWhitelist={ORIGINS}
      onMessage={onMessage}
      onShouldStartLoadWithRequest={allowNavigation}
      setSupportMultipleWindows={false}
      javaScriptCanOpenWindowsAutomatically={false}
      textZoom={100}
      overScrollMode="never"
      hideKeyboardAccessoryView
      style={styles.web}
      containerStyle={styles.web}
    />
  );
};

export const BufferWebEditor = memo(
  Editor,
  (before, after) =>
    before.epoch === after.epoch && before.onReplace === after.onReplace
);

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: bufferTokens.colors.background },
});
