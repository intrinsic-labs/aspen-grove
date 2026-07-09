import { Drawer } from 'expo-router/drawer';
import { AppDrawerContent } from '@interface/components/drawer/AppDrawerContent';
import { DrawerMenuButton } from '@interface/components/drawer/DrawerMenuButton';
import { useAspenGroveTheme } from '@/interface/hooks/useAspenGroveTheme';

const DrawerLayout = () => {
  const { colors } = useAspenGroveTheme();

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        drawerType: 'slide',
        drawerStyle: {
          backgroundColor: colors.oppositePrimary,
          width: '82%',
        },
        sceneStyle: {
          backgroundColor: colors.oppositePrimary,
        },
        overlayColor: 'rgba(255,255,255,0.08)',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.oppositePrimary,
        },
        headerTitleStyle: {
          color: colors.primary,
          fontFamily: 'IBMPlexMono-Medium',
          fontSize: 19,
        },
        headerTintColor: colors.accentColor,
        headerLeft: () => <DrawerMenuButton />,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: '',
          drawerLabel: 'Home',
        }}
      />
      <Drawer.Screen
        name="trees"
        options={{
          title: 'Loom Trees',
        }}
      />
      <Drawer.Screen
        name="search"
        options={{
          title: 'Search',
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          // The settings stack renders its own headers (push/pop nav).
          headerShown: false,
        }}
      />
    </Drawer>
  );
};

export default DrawerLayout;
