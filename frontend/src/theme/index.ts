import { createTheme, Theme } from '@mui/material/styles';
import { lightPalette, darkPalette } from './palette';
import { typography } from './typography';
import { getComponentOverrides } from './components';

export type ThemeMode = 'light' | 'dark';

export const createOporaTheme = (mode: ThemeMode): Theme => {
  const palette = mode === 'light' ? lightPalette : darkPalette;

  return createTheme({
    palette,
    typography,
    shape: {
      borderRadius: 10,
    },
    spacing: 8,
    components: getComponentOverrides(mode),
  });
};

export { lightPalette, darkPalette };
