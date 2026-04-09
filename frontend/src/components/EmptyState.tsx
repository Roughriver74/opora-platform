import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { InboxOutlined } from '@mui/icons-material';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(0,0,0,0.03)',
          mb: 3,
        }}
      >
        <InboxOutlined
          sx={{
            fontSize: 40,
            color: 'text.secondary',
            opacity: 0.5,
          }}
        />
      </Box>

      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: 'text.primary',
          mb: 1,
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            maxWidth: 360,
            lineHeight: 1.6,
            mb: action ? 3 : 0,
          }}
        >
          {description}
        </Typography>
      )}

      {action && (
        <Box sx={{ mt: description ? 0 : 3 }}>
          {action}
        </Box>
      )}
    </Box>
  );
};

export default EmptyState;
