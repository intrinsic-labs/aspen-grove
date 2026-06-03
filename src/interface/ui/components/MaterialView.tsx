// components/MaterialView.tsx

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAspenGroveTheme } from '@interface/hooks/useAspenGroveTheme';
import type { BlurVariant } from '../value-objects/blur';

interface MaterialViewProps extends React.ComponentProps<typeof View> {
  variant?: BlurVariant;
  tintOverride?: 'light' | 'dark' | 'default' | 'prominent';
  children?: React.ReactNode;
}

export function MaterialView({
  variant = 'regular',
  tintOverride,
  style,
  children,
  ...viewProps
}: MaterialViewProps) {
  const { blur } = useAspenGroveTheme();
  const config = blur[variant];
  const tint = tintOverride ?? config.tint;

  return (
    <View style={[styles.container, style]} {...viewProps}>
      <BlurView
        intensity={config.intensity}
        tint={tint}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      {Platform.OS === 'android' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: `rgba(242,242,242,${config.overlayOpacity})` },
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
