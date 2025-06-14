import React from 'react';
import { FormControl, FormLabel, FormGroup, FormControlLabel, Checkbox, FormHelperText } from '@mui/material';
import { FieldInputProps } from '../../types';

export const CheckboxInput: React.FC<FieldInputProps> = ({ 
  field, 
  value, 
  onChange, 
  error, 
  compact = false 
}) => {
  return (
    <FormControl 
      component="fieldset" 
      margin={compact ? "dense" : "normal"} 
      error={!!error}
    >
      <FormLabel component="legend">{field.label}</FormLabel>
      <FormGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!value}
              onChange={(e) => onChange(field.name, e.target.checked)}
              name={field.name}
            />
          }
          label={field.label}
        />
      </FormGroup>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
};
