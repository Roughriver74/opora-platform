import React from 'react';
import { TextField } from '@mui/material';
import { FieldInputProps } from '../../types';
import { getFieldStyles } from '../../utils/fieldStyles';

export const DateInput: React.FC<FieldInputProps> = ({ 
  field, 
  value, 
  onChange, 
  error, 
  compact = false 
}) => {
  const styles = getFieldStyles(compact);

  return (
    <TextField
      fullWidth
      id={field.name}
      name={field.name}
      label={field.label}
      type="date"
      margin={compact ? "dense" : "normal"}
      value={value || ''}
      onChange={(e) => onChange(field.name, e.target.value)}
      required={field.required}
      error={!!error}
      helperText={error}
      size={compact ? "small" : "medium"}
      InputLabelProps={{
        shrink: true,
      }}
      sx={styles.textField}
    />
  );
};
