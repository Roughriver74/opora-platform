import React from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import { Form } from '../../../../types';

interface FormSettingsProps {
  formData: Partial<Form>;
  dealCategories: any[];
  onFormChange: (name: string, value: any) => void;
}

export const FormSettings: React.FC<FormSettingsProps> = ({
  formData,
  dealCategories,
  onFormChange,
}) => {
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField
          fullWidth
          label="Идентификатор формы"
          value={formData.name || ''}
          onChange={(e) => onFormChange('name', e.target.value)}
          required
          helperText="Уникальный идентификатор (без пробелов)"
          error={!formData.name}
          size="small"
          margin="dense"
        />

        <TextField
          fullWidth
          label="Заголовок формы"
          value={formData.title || ''}
          onChange={(e) => onFormChange('title', e.target.value)}
          required
          error={!formData.title}
          size="small"
          margin="dense"
        />
      </Stack>

      <TextField
        fullWidth
        label="Описание формы"
        value={formData.description || ''}
        onChange={(e) => onFormChange('description', e.target.value)}
        multiline
        rows={2}
        size="small"
        margin="dense"
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <FormControl fullWidth size="small" margin="dense">
          <InputLabel>Категория сделки в Битрикс24</InputLabel>
          <Select
            value={formData.bitrixDealCategory || ''}
            onChange={(e) => onFormChange('bitrixDealCategory', e.target.value)}
            label="Категория сделки в Битрикс24"
            size="small"
          >
            <MenuItem value="">По умолчанию</MenuItem>
            {dealCategories.map((category) => (
              <MenuItem key={category.ID} value={category.ID}>
                {category.NAME}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={formData.isActive || false}
              onChange={(e) => onFormChange('isActive', e.target.checked)}
              size="small"
            />
          }
          label="Форма активна"
          sx={{ 
            minWidth: 'fit-content',
            '& .MuiFormControlLabel-label': { 
              fontSize: '0.875rem' 
            } 
          }}
        />
      </Stack>

      <TextField
        fullWidth
        label="Сообщение об успешной отправке"
        value={formData.successMessage || 'Спасибо! Ваша заявка успешно отправлена.'}
        onChange={(e) => onFormChange('successMessage', e.target.value)}
        size="small"
        margin="dense"
      />
    </Stack>
  );
}; 