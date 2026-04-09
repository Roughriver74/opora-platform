import React from 'react';
import { Chip, useTheme } from '@mui/material';
import { Box } from '@mui/material';

type StatusKey = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'failed';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; color: 'info' | 'warning' | 'success' | 'error' }
> = {
  planned: { label: 'Запланирован', color: 'info' },
  in_progress: { label: 'В работе', color: 'warning' },
  completed: { label: 'Завершён', color: 'success' },
  cancelled: { label: 'Отменён', color: 'error' },
  failed: { label: 'Ошибка', color: 'error' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
  const theme = useTheme();

  const config = STATUS_CONFIG[status as StatusKey] || {
    label: status,
    color: 'default' as const,
  };

  const paletteColor = config.color !== ('default' as string)
    ? theme.palette[config.color as 'info' | 'warning' | 'success' | 'error']
    : { main: theme.palette.text.secondary, light: theme.palette.action.hover };

  return (
    <Chip
      size={size}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: paletteColor.main,
              flexShrink: 0,
            }}
          />
          {config.label}
        </Box>
      }
      sx={{
        borderRadius: '16px',
        fontWeight: 600,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        height: size === 'small' ? 24 : 32,
        bgcolor: paletteColor.light,
        color: paletteColor.main,
        border: 'none',
        '& .MuiChip-label': {
          px: 1.25,
        },
      }}
    />
  );
};

export default StatusBadge;
