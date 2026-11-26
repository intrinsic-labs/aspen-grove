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
  type HostMessage,
} from './web-editor-protocol';
import { editorUnavailable } from '../composition-barrier';
import { useEditorSession } from './useEditorSession';
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
 * while typing, and the page is never handed text back (the host only
 * acknowledges revisions, see useEditorSession). The component is memoized on
 * `epoch` and the sink, so a host re-render per keystroke does not reach the
 * WebView. Style is sent with each load; a later style change
 * takes effect at the next one.
 */
const Editor = ({
  epoch,
  caret,
  readOnly,
  text,
  runs,
  ends,
  composition,
  textStyle,
  headerHeight,
  topGap,
  placeholder = '',
  sink,
}: BufferWebEditorProps) => {
  const webView = useRef<WebView>(null);
  const ready = useRef(false);
  const latest = useRef({ epoch, text, runs, ends, readOnly, caret });
  latest.current = { epoch, text, runs, ends, readOnly, caret };
  const style = useRef(
    webEditorStyle(textStyle, headerHeight, topGap, placeholder)
  );
  style.current = webEditorStyle(textStyle, headerHeight, topGap, placeholder);

  const send = useCallback((message: HostMessage) => {
    webView.current?.postMessage(encodeHostMessage(message));
  }, []);

  const load = useCallback(() => {
    const document = latest.current;
    send({
      type: 'load',
      epoch: document.epoch,
      text: document.text,
      caret: document.caret,
      readOnly: document.readOnly,
      modelRanges: modelRangesOf(document.runs),
      ends: document.ends,
      style: style.current,
    });
  }, [send]);

  useEffect(() => {
    if (ready.current) {
      load();
    }
  }, [epoch, load]);

  const { receive, settle } = useEditorSession(epoch, sink, send);
  useEffect(() => {
    composition.settle = settle;
    composition.end = () =>
      send({ type: 'endComposition', epoch: latest.current.epoch });
    return () => {
      composition.settle = editorUnavailable;
      composition.end = () => {};
    };
  }, [composition, send, settle]);

  useEffect(() => {
    if (ready.current) send({ type: 'readOnly', epoch, readOnly });
  }, [epoch, readOnly, send]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseEditorMessage(event.nativeEvent.data);
      if (message?.type === 'ready') {
        ready.current = true;
        load();
      } else if (message) {
        receive(message);
      }
    },
    [load, receive]
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
    before.epoch === after.epoch &&
    before.readOnly === after.readOnly &&
    before.sink === after.sink
);

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: bufferTokens.colors.background },
});
