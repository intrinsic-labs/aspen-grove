// components/MaterialView.tsx

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAspenGroveTheme } from '@interface/hooks/useAspenGroveTheme';
import type { BlurVariant } from '../value-objects/blur';

interface MaterialViewProps extends React.ComponentProps<typeof View> {
  variant?: BlurVariant;
  children?: React.ReactNode;
}

export function MaterialView({
  variant = 'systemThinDark',
  style,
  children,
  ...viewProps
}: MaterialViewProps) {
  const { blur } = useAspenGroveTheme();
  const config = blur[variant];

  return (
    <View style={[styles.container, style]} {...viewProps}>
      <BlurView
        intensity={config.intensity}
        tint={config.tint}
        blurMethod="dimezisBlurView"
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
