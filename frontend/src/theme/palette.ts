import { PaletteOptions } from '@mui/material/styles';

export const lightPalette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#007AFF', // iOS System Blue
    light: '#4DA1FF',
    dark: '#005CE6',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#5856D6', // iOS Purple
    light: '#7A78E0',
    dark: '#4543B3',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#F2F2F7', // iOS Grouped Background Light
    paper: '#FFFFFF',
  },
  text: {
    primary: '#000000',
    secondary: '#8E8E93', // iOS System Gray
  },
  divider: 'rgba(60, 60, 67, 0.15)', // iOS Separator
  error: {
    main: '#FF3B30',
    light: '#FF6961',
  },
  warning: {
    main: '#FF9500',
    light: '#FFB340',
  },
  success: {
    main: '#34C759',
    light: '#65D480',
  },
  info: {
    main: '#5AC8FA',
    light: '#7ED6FB',
  },
};

export const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#0A84FF', // iOS Dark System Blue
    light: '#42A1FF',
    dark: '#0066D6',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#5E5CE6',
    light: '#7D7BEB',
    dark: '#4745C4',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#000000', // iOS Pitch Black background
    paper: '#1C1C1E', // iOS Secondary System Background Dark
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#8E8E93',
  },
  divider: 'rgba(84, 84, 88, 0.65)',
  error: {
    main: '#FF453A',
    light: '#FF675E',
  },
  warning: {
    main: '#FF9F0A',
    light: '#FFB43B',
  },
  success: {
    main: '#30D158',
    light: '#5AD87A',
  },
  info: {
    main: '#64D2FF',
    light: '#83DEFF',
  },
};
