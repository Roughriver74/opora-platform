import { TypographyOptions } from '@mui/material/styles/createTypography';

export const typography: TypographyOptions = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  h1: {
    fontSize: '2.5rem', // iOS Large Title
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '1.75rem', 
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1.3,
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h5: {
    fontSize: '1.125rem', // Often used for top bar titles
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  subtitle1: {
    fontSize: '1.0625rem', // ~17px (iOS body size)
    fontWeight: 500,
    lineHeight: 1.4,
  },
  subtitle2: {
    fontSize: '0.9375rem', // ~15px
    fontWeight: 500,
    lineHeight: 1.4,
  },
  body1: {
    fontSize: '1.0625rem', // 17px base for max readability
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.9375rem', // 15px secondary
    lineHeight: 1.5,
  },
  button: {
    fontSize: '1.0625rem',
    fontWeight: 600,
    textTransform: 'none',
    letterSpacing: '0',
  },
  caption: {
    fontSize: '0.8125rem', // 13px
    lineHeight: 1.4,
  },
  overline: {
    fontSize: '0.6875rem', // 11px
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
};
