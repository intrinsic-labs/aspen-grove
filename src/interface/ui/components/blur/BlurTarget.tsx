import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { useAspenGroveTheme } from '@interface/hooks/useAspenGroveTheme';
import { useBlurTarget } from './blur-target-context';

type BlurTargetProps = {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * The content a screen's materials blur. It must not contain them (a blur
 * cannot sample itself), so the composer sits beside it, over it. It is
 * opaque, painted the screen's own black, so the blur has a backdrop.
 */
export const BlurTarget = ({ style, children }: BlurTargetProps) => {
  const target = useBlurTarget();
  const { colors } = useAspenGroveTheme();
  const opaque = [{ backgroundColor: colors.oppositePrimary }, style];

  if (!target) return <View style={opaque}>{children}</View>;
  return (
    <BlurTargetView ref={target} style={opaque}>
      {children}
    </BlurTargetView>
  );
};
