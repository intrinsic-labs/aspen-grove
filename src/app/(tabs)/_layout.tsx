import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'react-native';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';

const TabsLayout = () => {
  const { colors } = useAspenGroveTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.oppositePrimary,
        },
        headerTitleStyle: {
          color: colors.primary,
          fontFamily: 'IBMPlexMono-Medium',
          fontSize: 19,
          letterSpacing: 0.6,
        },
        tabBarStyle: {
          backgroundColor: colors.oppositePrimary,
          borderTopColor: colors.oppositePrimary,
        },
        tabBarActiveTintColor: colors.accentColor,
        tabBarInactiveTintColor: colors.secondaryVariant,
        tabBarLabelStyle: {
          fontFamily: 'IBMPlexMono-Regular',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Loom Trees',
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

export default TabsLayout;
