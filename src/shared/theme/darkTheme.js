// Dark mode for the whole app.
//
// Most screens build their styles once, at import time, from the shared colour table `C` (shared/ui/kit)
// and from literal colours such as '#fff'. So the theme has to be chosen BEFORE the screens are imported:
// App.jsx reads the saved mode, calls applyDarkTheme() when needed, and only then loads the app. Changing the
// mode in Settings saves it and reloads the app (see ThemeContext).
import { Appearance, StyleSheet } from 'react-native';

let bootMode = 'system';
let darkApplied = false;
export const setBootMode = (mode) => { bootMode = mode; };
export const getBootMode = () => bootMode;
export const isDarkApplied = () => darkApplied;

export const resolveMode = (mode) => (mode === 'dark' || mode === 'light' ? mode : (Appearance.getColorScheme() || 'light'));

export const DARK_C = {
  bg: '#081A36', card: '#102448', text: '#F5F9FF', muted: '#B8C7DF', border: '#24416B',
  blue: '#3D7FF0', blueSoft: '#16315E', blueLine: '#24416B',
  greenSoft: '#143B2A', amberSoft: '#4A3510', redSoft: '#4A1D22', purpleSoft: '#2E2459',
};

const SURFACE = '#102448';
const TINT = '#16315E';
const LINE = '#24416B';
const LIGHT_TEXT = '#F5F9FF';

const parseHex = (value) => {
  if (typeof value !== 'string') return null;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const sat = ([r, g, b]) => { const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
const lighten = ([r, g, b], t) => `#${[r, g, b].map((c) => Math.round(c + (255 - c) * t).toString(16).padStart(2, '0')).join('')}`;

const BG_KEYS = new Set(['backgroundColor']);
const BORDER_KEYS = new Set(['borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor']);

function mapColor(key, value) {
  const rgb = parseHex(value);
  if (!rgb) return value;
  const l = lum(rgb);
  if (BG_KEYS.has(key)) {
    if (l > 0.93) return SURFACE;
    if (l > 0.8 && sat(rgb) < 0.5) return TINT;
    return value;
  }
  if (BORDER_KEYS.has(key)) return l > 0.7 ? LINE : value;
  if (key === 'color') {
    if (l < 0.3) return sat(rgb) < 0.4 ? LIGHT_TEXT : lighten(rgb, 0.45);
    return value;
  }
  return value;
}

function mapStyle(style) {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return style;
  const out = {};
  for (const key of Object.keys(style)) {
    const v = style[key];
    out[key] = typeof v === 'string' ? mapColor(key, v) : v;
  }
  return out;
}

export function applyDarkTheme() {
  if (darkApplied) return;
  darkApplied = true;
  // The shared colour table `C` (shared/ui/kit) swaps itself to DARK_C when it loads and darkApplied is true.
  // Literal colours inside every StyleSheet.create(...) created from now on are remapped here.
  const original = StyleSheet.create.bind(StyleSheet);
  StyleSheet.create = (styles) => {
    const mapped = {};
    for (const name of Object.keys(styles)) mapped[name] = mapStyle(styles[name]);
    return original(mapped);
  };
}
