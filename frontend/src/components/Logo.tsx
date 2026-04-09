import React from 'react';
import { Typography, useTheme } from '@mui/material';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const SIZE_MAP: Record<string, { fontSize: string; letterSpacing: string }> = {
  small: { fontSize: '1rem', letterSpacing: '0.01em' },
  medium: { fontSize: '1.25rem', letterSpacing: '0.02em' },
  large: { fontSize: '1.75rem', letterSpacing: '0.03em' },
};

const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true }) => {
  const theme = useTheme();
  const config = SIZE_MAP[size];

  return (
    <Typography
      component="span"
      sx={{
        fontWeight: 800,
        fontSize: config.fontSize,
        letterSpacing: config.letterSpacing,
        color: theme.palette.mode === 'dark'
          ? theme.palette.common.white
          : theme.palette.primary.main,
        userSelect: 'none',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {showText ? 'ОПОРА' : 'О'}
    </Typography>
  );
};

export default Logo;
