import React from 'react';
import { TextField } from '@mui/material';
import { FieldInputProps } from '../../types';
import { FIELD_CONSTANTS } from '../../constants';
import { getFieldStyles } from '../../utils/fieldStyles';

export const TextareaInput: React.FC<FieldInputProps> = ({ 
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
      margin={compact ? "dense" : "normal"}
      value={value || ''}
      onChange={(e) => onChange(field.name, e.target.value)}
      required={field.required}
      error={!!error}
      helperText={error}
      placeholder={field.placeholder || ''}
      multiline
      rows={compact ? FIELD_CONSTANTS.COMPACT_TEXTAREA_ROWS : FIELD_CONSTANTS.DEFAULT_TEXTAREA_ROWS}
      size={compact ? "small" : "medium"}
      sx={styles.textField}
    />
  );
};
