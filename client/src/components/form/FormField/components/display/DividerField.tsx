import React from 'react';
import { Divider, Typography } from '@mui/material';
import { FieldInputProps } from '../../types';

export const DividerField: React.FC<FieldInputProps> = ({ 
  field, 
  compact = false 
}) => {
  return (
    <div style={{ margin: compact ? '8px 0' : '16px 0' }}>
      {field.label && (
        <Typography 
          variant={compact ? "body2" : "body1"} 
          color="textSecondary" 
          gutterBottom
        >
          {field.label}
        </Typography>
      )}
      <Divider />
    </div>
  );
};
