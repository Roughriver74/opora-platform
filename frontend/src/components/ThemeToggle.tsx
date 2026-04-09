import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { LightMode, DarkMode } from '@mui/icons-material';
import { useThemeMode } from '../context/ThemeContext';

interface ThemeToggleProps {
  size?: 'small' | 'medium';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ size = 'medium' }) => {
  const { mode, toggleTheme } = useThemeMode();

  return (
    <Tooltip title="Переключить тему" arrow>
      <IconButton
        onClick={toggleTheme}
        size={size}
        sx={{
          color: 'text.secondary',
          '&:hover': {
            color: 'warning.main',
            bgcolor: mode === 'dark'
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.04)',
          },
          transition: 'color 0.15s ease',
        }}
      >
        {mode === 'dark' ? (
          <LightMode fontSize={size} />
        ) : (
          <DarkMode fontSize={size} />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
