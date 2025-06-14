import React from 'react';
import { TextField } from '@mui/material';
import { FieldInputProps } from '../../types';
import { getFieldStyles } from '../../utils/fieldStyles';

export const TextInput: React.FC<FieldInputProps> = ({ 
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
      type={field.type === 'number' ? 'number' : 'text'}
      margin={compact ? "dense" : "normal"}
      value={value || ''}
      onChange={(e) => onChange(field.name, e.target.value)}
      required={field.required}
      error={!!error}
      helperText={error}
      placeholder={field.placeholder || ''}
      size={compact ? "small" : "medium"}
      sx={styles.textField}
    />
  );
};
