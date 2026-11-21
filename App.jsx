// App entry. The saved theme is read first so dark mode can be applied BEFORE any screen is imported
// (screens build their styles at import time). See src/shared/theme/darkTheme.js.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';

// Keep the splash screen visible while we load the theme and the app
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [Main, setMain] = useState(null);

  useEffect(() => {
    (async () => {
      let mode = 'system';
      try { mode = (await AsyncStorage.getItem('themeMode')) || 'system'; } catch (e) { /* use system */ }
      const theme = require('./src/shared/theme/darkTheme');
      theme.setBootMode(mode);
      // Make native pieces (keyboard, alerts) follow the chosen mode too.
      try { Appearance.setColorScheme(mode === 'dark' || mode === 'light' ? mode : null); } catch (e) { /* older RN */ }
      if (theme.resolveMode(mode) === 'dark') theme.applyDarkTheme();
      setMain(() => require('./src/AppMain').default);
    })();
  }, []);

  if (!Main) return null;
  return <Main />;
}
