// components/MaterialView.tsx

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAspenGroveTheme } from '@interface/hooks/useAspenGroveTheme';
import type { BlurVariant } from '../value-objects/blur';
import { useBlurTarget } from './blur/blur-target-context';
import { materialBlurMethod } from './blur/material-blur-method';

interface MaterialViewProps extends React.ComponentProps<typeof View> {
  variant?: BlurVariant;
  children?: React.ReactNode;
}

/**
 * A system material. On Android it blurs the screen's `BlurTarget` (see
 * `BlurTargetScope`) under a flat overlay; with no target it is the overlay
 * alone.
 */
export function MaterialView({
  variant = 'systemThinDark',
  style,
  children,
  ...viewProps
}: MaterialViewProps) {
  const { blur } = useAspenGroveTheme();
  const config = blur[variant];
  const target = useBlurTarget();

  return (
    <View style={[styles.container, style]} {...viewProps}>
      <BlurView
        intensity={config.intensity}
        tint={config.tint}
        blurMethod={materialBlurMethod(Platform.OS, target !== null)}
        blurTarget={target ?? undefined}
        style={StyleSheet.absoluteFill}
      />
      {Platform.OS === 'android' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: config.overlayColor },
          ]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
