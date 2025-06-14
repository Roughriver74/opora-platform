import React from 'react';
import { FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, FormHelperText } from '@mui/material';
import { FieldInputProps } from '../../types';

export const RadioInput: React.FC<FieldInputProps> = ({ 
  field, 
  value, 
  onChange, 
  error, 
  compact = false,
  options = []
}) => {
  return (
    <FormControl 
      component="fieldset" 
      margin={compact ? "dense" : "normal"} 
      error={!!error}
    >
      <FormLabel component="legend">{field.label}</FormLabel>
      <RadioGroup
        name={field.name}
        value={value || ''}
        onChange={(e) => onChange(field.name, e.target.value)}
      >
        {options.map((option) => (
          <FormControlLabel 
            key={option.value} 
            value={option.value} 
            control={<Radio />} 
            label={option.label} 
          />
        ))}
      </RadioGroup>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
};
