import { PaletteOptions } from '@mui/material/styles';

// OPORA Design System — matches landing page (opora.b-ci.ru)
// Primary: Emerald green, Background: Warm stone, Accents: Teal

export const lightPalette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#059669',     // Emerald-600 (landing CTA color)
    light: '#34D399',    // Emerald-400
    dark: '#047857',     // Emerald-700
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#0D9488',     // Teal-600 (landing secondary)
    light: '#5EEAD4',    // Teal-300
    dark: '#0F766E',     // Teal-700
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#FAFAF9',  // Stone-50 (landing body bg)
    paper: '#FFFFFF',
  },
  text: {
    primary: '#1C1917',  // Stone-900 (landing text)
    secondary: '#78716C', // Stone-500
  },
  divider: '#E7E5E4',    // Stone-200
  error: {
    main: '#EF4444',     // Red-500
    light: '#FEE2E2',
  },
  warning: {
    main: '#F59E0B',     // Amber-500
    light: '#FEF3C7',
  },
  success: {
    main: '#16A34A',     // Green-600
    light: '#DCFCE7',
  },
  info: {
    main: '#2563EB',     // Blue-600 (landing highlight)
    light: '#DBEAFE',
  },
};

export const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#34D399',     // Emerald-400 (brighter for dark)
    light: '#6EE7B7',    // Emerald-300
    dark: '#059669',     // Emerald-600
    contrastText: '#022C22',
  },
  secondary: {
    main: '#5EEAD4',     // Teal-300
    light: '#99F6E4',    // Teal-200
    dark: '#0D9488',     // Teal-600
    contrastText: '#042F2E',
  },
  background: {
    default: '#0C0A09',  // Stone-950
    paper: '#1C1917',    // Stone-900
  },
  text: {
    primary: '#FAFAF9',  // Stone-50
    secondary: '#A8A29E', // Stone-400
  },
  divider: '#292524',     // Stone-800
  error: {
    main: '#F87171',     // Red-400
    light: '#7F1D1D',
  },
  warning: {
    main: '#FBBF24',     // Amber-400
    light: '#78350F',
  },
  success: {
    main: '#4ADE80',     // Green-400
    light: '#14532D',
  },
  info: {
    main: '#60A5FA',     // Blue-400
    light: '#1E3A5F',
  },
};
