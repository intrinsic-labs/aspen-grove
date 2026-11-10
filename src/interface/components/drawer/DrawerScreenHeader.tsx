import { Header } from '@react-navigation/elements';
import { DrawerMenuButton } from './DrawerMenuButton';
import { useDrawerHeaderStyle } from './useDrawerHeaderStyle';

type DrawerScreenHeaderProps = {
  readonly title: string;
};

/**
 * The JS header the drawer draws for its own screens, for a drawer
 * destination that lives inside a nested native stack (Settings).
 *
 * A native-stack `headerLeft` becomes a UIBarButtonItem, which iOS 26 wraps
 * in a round Liquid Glass background; the drawer's JS header does not. The
 * installed react-native-screens (4.16) can't turn that background off
 * (`hidesSharedBackground` isn't supported yet), so Settings uses this
 * header to match Home, Loom Trees and Search.
 */
export const DrawerScreenHeader = ({ title }: DrawerScreenHeaderProps) => {
  const style = useDrawerHeaderStyle();

  return (
    <Header
      title={title}
      headerLeft={() => <DrawerMenuButton />}
      {...style}
    />
  );
};
