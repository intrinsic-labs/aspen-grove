import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeColors } from '@interface/hooks/useThemeColors';

const RootLayout = () => {
  const { colors } = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.secondary,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.background,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          color: colors.primary,
          fontFamily: 'IBMPlexMono-ExtraLight',
          fontWeight: '400',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Loom Trees',
          tabBarLabel: 'Loom Trees',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'leaf' : 'leaf-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarLabel: 'Documents',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'document' : 'document-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'options' : 'options-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default RootLayout;
