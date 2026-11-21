import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DevSettings, Platform, useColorScheme } from 'react-native';
import { getBootMode, isDarkApplied } from './darkTheme';

const ThemeContext = createContext(null);
const palettes = {
  light: { background: '#F5F9FF', surface: '#FFFFFF', text: '#102A56', muted: '#64748B', border: '#DCE7F5', primary: '#0866FF', secondary: '#14B8A6', card: '#FFFFFF', danger: '#DC3545' },
  dark: { background: '#081A36', surface: '#102448', text: '#F5F9FF', muted: '#B8C7DF', border: '#24416B', primary: '#4D8DFF', secondary: '#35D0BA', card: '#102448', danger: '#FF7A86' },
};

// Screens build their styles once at startup, so a theme change is applied by reloading the app.
async function reloadApp() {
  try {
    if (Platform.OS === 'web') { window.location.reload(); return; }
    try { const Updates = require('expo-updates'); if (Updates.reloadAsync) { await Updates.reloadAsync(); return; } } catch (e) { /* not available */ }
    DevSettings.reload();
  } catch (e) { /* the new theme will apply the next time the app starts */ }
}

export function ThemeProvider({ children }) {
  const system = useColorScheme() || 'light';
  const [mode, setMode] = useState(getBootMode());
  const resolved = mode === 'system' ? system : mode;

  const setThemeMode = async (v) => {
    try { await AsyncStorage.setItem('themeMode', v); } catch (e) { /* ignore */ }
    setMode(v);
  };

  // Reload when the effective theme differs from the one the app was started with.
  useEffect(() => {
    const applied = isDarkApplied() ? 'dark' : 'light';
    if (resolved !== applied) reloadApp();
  }, [resolved]);

  const value = useMemo(() => ({ mode, setThemeMode, resolved, colors: palettes[resolved] }), [mode, resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
