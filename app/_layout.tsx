import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppContextProvider, useAppContext } from '@interface/context/app-context';
import { LoadingScreen } from '@interface/components/loading-screen';
import { ErrorScreen } from '@interface/components/error-screen';

/**
 * Root layout content (inside provider)
 *
 * Handles initialization state:
 * - Loading: show loading screen
 * - Error: show error screen
 * - Ready: show tabs
 */
function RootLayoutContent() {
  const { isLoading, error } = useAppContext();

  // Show loading screen while initializing
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show error screen if initialization failed
  if (error) {
    return <ErrorScreen error={error} />;
  }

  // App is ready - show tabs
  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

/**
 * Root layout
 *
 * Wraps the app with AppContextProvider to initialize repositories and app state.
 */
export default function RootLayout() {
  return (
    <AppContextProvider>
      <RootLayoutContent />
    </AppContextProvider>
  );
}
