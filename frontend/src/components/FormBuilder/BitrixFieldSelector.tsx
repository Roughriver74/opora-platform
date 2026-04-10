// frontend/src/components/FormBuilder/BitrixFieldSelector.tsx
import { Autocomplete, CircularProgress, TextField, Typography } from '@mui/material';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { BitrixField, EntityType } from './types';

const BITRIX_TYPE_GROUP: Record<string, string> = {
  list: 'Списки',
  string: 'Текстовые',
  datetime: 'Даты',
  date: 'Даты',
  double: 'Числа',
  integer: 'Числа',
  boolean: 'Чекбоксы',
};

interface Props {
  entityType: EntityType;
  value: string | null;
  onChange: (field: BitrixField | null) => void;
  disabled?: boolean;
}

const BitrixFieldSelector: React.FC<Props> = ({ entityType, value, onChange, disabled }) => {
  const { data: bitrixFields = [], isLoading, isError } = useQuery<BitrixField[]>(
    ['bitrixFields', entityType],
    async () => {
      const res = await api.get(`/admin/bitrix-fields/${entityType}`);
      return res.data ?? [];
    },
    { staleTime: 5 * 60 * 1000 }  // cache 5 min
  );

  const selectedField = bitrixFields.find(f => f.field_id === value) ?? null;

  return (
    <Autocomplete
      disabled={disabled}
      loading={isLoading}
      options={bitrixFields}
      groupBy={f => BITRIX_TYPE_GROUP[f.type] ?? 'Прочее'}
      getOptionLabel={f => `${f.title} (${f.field_id})`}
      value={selectedField}
      onChange={(_, newVal) => onChange(newVal)}
      isOptionEqualToValue={(opt, val) => opt.field_id === val.field_id}
      renderInput={params => (
        <TextField
          {...params}
          label="Поле Bitrix24"
          size="small"
          error={isError}
          helperText={isError ? 'Не удалось загрузить поля Bitrix24' : undefined}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading && <CircularProgress size={16} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.field_id}>
          <Typography variant="body2">{option.title}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {option.field_id}
          </Typography>
        </li>
      )}
      loadingText="Загрузка..."
      noOptionsText={isError ? 'Ошибка загрузки' : 'Поля не найдены'}
    />
  );
};

export default BitrixFieldSelector;
