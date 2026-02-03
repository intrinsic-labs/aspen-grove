import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

const RootLayout = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#808000',
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
              size={size} />
          ),
        }}
      />
    </Tabs>
  );
};

export default RootLayout;
