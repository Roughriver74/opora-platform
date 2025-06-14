import React, { useState, useRef, useEffect } from 'react';
import { FormControl, Autocomplete, TextField, CircularProgress } from '@mui/material';
import { FieldInputProps } from '../../types';
import { FIELD_TEXTS } from '../../constants';

export const AutocompleteInput: React.FC<FieldInputProps> = ({ 
  field, 
  value, 
  onChange, 
  error, 
  compact = false,
  options = [],
  loading = false,
  onSearchChange
}) => {
  const [inputValue, setInputValue] = useState('');
  const isSelectingRef = useRef(false);
  const selectedOption = options.find(opt => opt.value === value) || null;

  // Синхронизируем inputValue с выбранным значением
  useEffect(() => {
    if (selectedOption && !isSelectingRef.current) {
      setInputValue(selectedOption.label);
    } else if (!value && !isSelectingRef.current) {
      setInputValue('');
    }
  }, [selectedOption, value]);

  return (
    <FormControl fullWidth margin={compact ? "dense" : "normal"}>
      <Autocomplete
        id={field.name}
        value={selectedOption}
        inputValue={inputValue}
        onInputChange={(_, newInputValue, reason) => {
          // Не отправляем запросы если пользователь выбирает из списка
          if (reason === 'reset' && isSelectingRef.current) {
            isSelectingRef.current = false;
            return;
          }
          
          setInputValue(newInputValue || '');
          
          // Отправляем запрос только при печати пользователем
          if (reason === 'input') {
            onSearchChange?.(newInputValue || '');
          }
        }}
        onChange={(_, newValue) => {
          isSelectingRef.current = true;
          onChange(field.name, newValue ? newValue.value : '');
          
          // После выбора показываем выбранное значение
          if (newValue) {
            setInputValue(newValue.label);
          } else {
            setInputValue('');
          }
          
          // Сбрасываем флаг через небольшой таймаут
          setTimeout(() => {
            isSelectingRef.current = false;
          }, 100);
        }}
        options={options}
        getOptionLabel={(option) => option?.label || ''}
        loading={loading}
        size={compact ? "small" : "medium"}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label}
            placeholder={field.placeholder || ''}
            error={!!error}
            helperText={error}
            required={field.required}
            size={compact ? "small" : "medium"}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        noOptionsText={FIELD_TEXTS.NO_OPTIONS}
        loadingText={FIELD_TEXTS.LOADING}
        filterOptions={(x) => x}
      />
    </FormControl>
  );
};
