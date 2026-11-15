import { useRef } from 'react';
import { Platform, ScrollView, type ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRevealFocusedField } from './useRevealFocusedField';

/** Space kept between a focused field and the keyboard. */
const FIELD_GAP = 24;

/**
 * A Form's scroll view inside a sheet, keeping the focused field above the
 * keyboard. On iOS, UIKit makes room for the keyboard
 * (`automaticallyAdjustKeyboardInsets`) and the field is then scrolled
 * clear of it (`useRevealFocusedField`); KeyboardAwareScrollView misplaces
 * fields in a page sheet. Android's sheets are full screen, where it works.
 */
export const SheetScrollView = (props: ScrollViewProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const onScroll = useRevealFocusedField(scrollRef, FIELD_GAP);

  if (Platform.OS !== 'ios') {
    return (
      <KeyboardAwareScrollView
        bottomOffset={FIELD_GAP}
        keyboardShouldPersistTaps="handled"
        {...props}
      />
    );
  }
  return (
    <ScrollView
      ref={scrollRef}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      {...props}
      onScroll={(event) => {
        onScroll(event);
        props.onScroll?.(event);
      }}
    />
  );
};
