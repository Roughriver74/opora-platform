import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { GroupDivider } from '../types';

interface DividerGroupProps {
  divider: GroupDivider;
  margin?: number;
}

export const DividerGroup: React.FC<DividerGroupProps> = ({
  divider,
  margin = 3
}) => {
  return (
    <Box sx={{ my: margin }}>
      <Typography 
        variant="subtitle1" 
        component="h3"
        sx={{ 
          mb: 1, 
          fontWeight: 500,
          color: 'text.secondary'
        }}
      >
        {divider.title}
      </Typography>
      <Divider />
    </Box>
  );
}; 