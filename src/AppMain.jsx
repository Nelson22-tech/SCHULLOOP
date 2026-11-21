import * as SplashScreen from 'expo-splash-screen';
import { useContext, useEffect, useState } from 'react';
import { AuthContext, AuthProvider } from './features/auth/AuthContext';
import { RootNavigator } from './navigation/RootNavigator';
import { initTracking } from './shared/services/trackingService';
import { setupI18n } from './shared/i18n';
import { ThemeProvider } from './shared/theme/ThemeContext';
import { registerForPushNotifications } from './shared/services/notificationService';

initTracking();

function RootApp() {
  const authContext = useContext(AuthContext);
  const { isLoading, isSignout, user } = authContext || {};

  useEffect(() => {
    if (user) registerForPushNotifications().catch(() => {});
  }, [user]);

  useEffect(() => {
    // Hide splash screen when auth is done loading
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Show splash screen while loading
  if (isLoading === undefined) {
    return null;
  }

  return <RootNavigator isLoading={isLoading} isSignout={isSignout} user={user} />;
}

export default function AppMain() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    setupI18n().finally(() => setI18nReady(true));
  }, []);

  // Wait for the saved/device language to load before rendering anything, so the very first
  // frame (including the login screen) is already in the right language.
  if (!i18nReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
