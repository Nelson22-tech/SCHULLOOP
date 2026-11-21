// Color constants
export const COLORS = {
  primary: '#0754D8',
  primaryDark: '#0E2A42',
  secondary: '#14B8A6',
  accent: '#0A66C2', // LinkedIn-style link/action blue, used sparingly for emphasis
  success: '#2A9D8F',
  warning: '#E9A23B',
  danger: '#DC3545',
  light: '#F5F9FF',
  surface: '#FFFFFF',
  dark: '#102A56',
  textPrimary: '#102A56',
  textSecondary: '#64748B',
  gray: '#64748B',
  lightGray: '#9AA5A9',
  border: '#E1EAF8',
  borderStrong: '#DCE7F5',
  white: '#FFFFFF',
};

// Border radii — consistent, moderate rounding reads as more professional
// than either sharp corners or overly pill-shaped elements.
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
};

// Font sizes
export const SIZES = {
  xs: 11,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  giant: 32,
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Common styles
export const COMMON_STYLES = {
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shadowLarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexBetween: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexStart: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  flexEnd: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
};

// API endpoints
export const API_CONFIG = {
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000,
};

// Status codes
export const STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error',
};

// User types
export const USER_TYPES = {
  PARENT: 'parent',
  STUDENT: 'student',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  SCHOOL: 'school',
};

// School types
export const SCHOOL_TYPES = {
  PRIMARY: 'Primary',
  SECONDARY: 'Secondary',
  UNIVERSITY: 'University',
  PRIVATE: 'Private',
  PUBLIC: 'Public',
};
