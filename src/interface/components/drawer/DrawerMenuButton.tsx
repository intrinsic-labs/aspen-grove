import { DrawerActions, useNavigation } from 'expo-router/react-navigation';
import { HeaderIconButton } from '@/interface/ui/value-objects';

/** Header hamburger that opens the app drawer from any nested screen. */
export const DrawerMenuButton = () => {
  const navigation = useNavigation();

  return (
    <HeaderIconButton
      icon="menu"
      testID="drawer-menu-button"
      accessibilityLabel="Open navigation menu"
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
    />
  );
};
