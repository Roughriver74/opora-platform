import { PaletteOptions } from '@mui/material/styles';

export const lightPalette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#1A56DB',
    light: '#3B82F6',
    dark: '#1E40AF',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#7C3AED',
    light: '#A78BFA',
    dark: '#5B21B6',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#F8FAFC',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
  },
  divider: '#E2E8F0',
  error: {
    main: '#DC2626',
    light: '#FEE2E2',
  },
  warning: {
    main: '#D97706',
    light: '#FEF3C7',
  },
  success: {
    main: '#059669',
    light: '#D1FAE5',
  },
  info: {
    main: '#0284C7',
    light: '#E0F2FE',
  },
};

export const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#60A5FA',
    light: '#93C5FD',
    dark: '#2563EB',
    contrastText: '#0F172A',
  },
  secondary: {
    main: '#A78BFA',
    light: '#C4B5FD',
    dark: '#7C3AED',
    contrastText: '#0F172A',
  },
  background: {
    default: '#0F172A',
    paper: '#1E293B',
  },
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
  },
  divider: '#334155',
  error: {
    main: '#F87171',
    light: '#7F1D1D',
  },
  warning: {
    main: '#FBBF24',
    light: '#78350F',
  },
  success: {
    main: '#34D399',
    light: '#064E3B',
  },
  info: {
    main: '#38BDF8',
    light: '#0C4A6E',
  },
};
