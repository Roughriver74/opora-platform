// frontend/src/components/FormBuilder/FieldOptionsEditor.tsx
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Box, Chip, Divider, IconButton, MenuItem, Select,
  Stack, TextField, Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { BitrixField, BitrixValueMapping } from './types';

interface Props {
  options: string[];
  bitrixField: BitrixField | null;
  bitrixValueMapping: BitrixValueMapping[];
  onChange: (options: string[], mapping: BitrixValueMapping[]) => void;
}

const FieldOptionsEditor: React.FC<Props> = ({
  options, bitrixField, bitrixValueMapping, onChange,
}) => {
  const [newOption, setNewOption] = useState('');

  const addOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed || options.some(o => o.toLowerCase() === trimmed.toLowerCase())) return;
    const updatedOptions = [...options, trimmed];
    const updatedMapping = [...bitrixValueMapping, { app_value: trimmed, bitrix_value: '' }];
    onChange(updatedOptions, updatedMapping);
    setNewOption('');
  };

  const removeOption = (opt: string) => {
    onChange(
      options.filter(o => o !== opt),
      bitrixValueMapping.filter(m => m.app_value !== opt),
    );
  };

  const updateBitrixValue = (appValue: string, bitrixValue: string) => {
    onChange(
      options,
      bitrixValueMapping.map(m => m.app_value === appValue ? { ...m, bitrix_value: bitrixValue } : m),
    );
  };

  const showMapping = bitrixField?.type === 'list' && (bitrixField.items?.length ?? 0) > 0;
  const mappableItems = showMapping ? (bitrixField!.items ?? []) : [];

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" mb={1} display="block">
        Варианты для выбора
      </Typography>

      {/* Existing options */}
      <Stack spacing={1} mb={1}>
        {options.map(opt => (
          <Box key={opt} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={opt} sx={{ flex: showMapping ? 0 : 1 }} />
            {showMapping && (
              <Select
                size="small"
                value={bitrixValueMapping.find(m => m.app_value === opt)?.bitrix_value ?? ''}
                onChange={e => updateBitrixValue(opt, e.target.value)}
                displayEmpty
                sx={{ flex: 1 }}
              >
                <MenuItem value=""><em>Не выбрано</em></MenuItem>
                {mappableItems.map(item => (
                  <MenuItem key={item.id} value={item.id}>{item.value}</MenuItem>
                ))}
              </Select>
            )}
            <IconButton size="small" color="error" onClick={() => removeOption(opt)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Stack>

      {showMapping && (
        <Typography variant="caption" color="text.secondary">
          Слева — значение в приложении, справа — значение в Bitrix24
        </Typography>
      )}

      <Divider sx={{ my: 1 }} />

      {/* Add new option */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          placeholder="Новый вариант"
          value={newOption}
          onChange={e => setNewOption(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
          sx={{ flex: 1 }}
        />
        <IconButton color="primary" onClick={addOption} disabled={!newOption.trim()}>
          <AddIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default FieldOptionsEditor;
