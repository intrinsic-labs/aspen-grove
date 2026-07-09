import { DrawerActions, useNavigation } from '@react-navigation/native';
import { HeaderIconButton } from '@/interface/ui/value-objects';

/** Header hamburger that opens the app drawer from any nested screen. */
export const DrawerMenuButton = () => {
  const navigation = useNavigation();

  return (
    <HeaderIconButton
      icon="menu"
      accessibilityLabel="Open navigation menu"
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
    />
  );
};
