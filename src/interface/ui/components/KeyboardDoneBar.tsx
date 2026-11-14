import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { loomUiTokens } from '../value-objects/loom-ui-tokens';

const bar = loomUiTokens.keyboardDoneBar;

type KeyboardDoneBarProps = {
  /** The `inputAccessoryViewID` of the fields it rides on. */
  readonly nativeID: string;
};

/**
 * SwiftUI's `ToolbarItem(placement: .keyboard)` holding a trailing "Done"
 * (FullScreenTextEditor.swift, OpenLoomExportSheet.swift): a glass capsule
 * over the keyboard that dismisses it. iOS only; Android has no keyboard
 * toolbar.
 */
export const KeyboardDoneBar = ({ nativeID }: KeyboardDoneBarProps) =>
  Platform.OS === 'ios' ? (
    <InputAccessoryView nativeID={nativeID} backgroundColor="transparent">
      <View style={styles.frame}>
        <GlassView
          glassEffectStyle="regular"
          colorScheme="dark"
          style={styles.capsule}
        >
          <Pressable
            testID="keyboard-done"
            onPress={Keyboard.dismiss}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </GlassView>
      </View>
    </InputAccessoryView>
  ) : null;

const styles = StyleSheet.create({
  frame: {
    paddingHorizontal: bar.sideInset,
    paddingBottom: bar.bottomGap,
  },
  capsule: {
    height: bar.height,
    borderRadius: bar.height / 2,
    paddingHorizontal: bar.textInset,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  done: {
    fontSize: bar.textSize,
    color: '#FFFFFF',
  },
});
