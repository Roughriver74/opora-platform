// frontend/src/components/FormBuilder/FieldSettingsDrawer.tsx
import {
  Box, Divider, Drawer, FormControlLabel, MenuItem,
  Select, FormControl, InputLabel, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import BitrixFieldSelector from './BitrixFieldSelector';
import FieldOptionsEditor from './FieldOptionsEditor';
import { BitrixField, EntityType, FIELD_TYPES, FieldDefinition, generateKey } from './types';

const DRAWER_WIDTH = 420;

interface Props {
  open: boolean;
  field: FieldDefinition | null;
  entityType: EntityType;
  hasBitrix: boolean;
  onClose: () => void;
  onChange: (patch: Partial<FieldDefinition>) => void;
}

const FieldSettingsDrawer: React.FC<Props> = ({
  open, field, entityType, hasBitrix, onClose, onChange,
}) => {
  const [tab, setTab] = useState(0);
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);

  // Reset tab when field changes
  useEffect(() => {
    setTab(0);
    setKeyManuallyEdited(false);
  }, [field?.key]);

  useEffect(() => {
    if (!hasBitrix) setTab(0);
  }, [hasBitrix]);

  if (!field) return null;

  const handleLabelChange = (label: string) => {
    if (!keyManuallyEdited) {
      onChange({ label, key: generateKey(label) });
    } else {
      onChange({ label });
    }
  };

  const handleKeyChange = (key: string) => {
    setKeyManuallyEdited(true);
    onChange({ key });
  };

  const handleBitrixFieldChange = (bitrixField: BitrixField | null) => {
    onChange({
      bitrix_field_id: bitrixField?.field_id ?? null,
      bitrix_field_type: bitrixField?.type ?? null,
    });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="persistent"
      sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, p: 0 } }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Настройки поля
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Основные" />
        {hasBitrix && <Tab label="Bitrix24" />}
      </Tabs>

      <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Название поля"
              size="small"
              fullWidth
              value={field.label}
              onChange={e => handleLabelChange(e.target.value)}
            />

            <TextField
              label="Ключ (key)"
              size="small"
              fullWidth
              value={field.key}
              onChange={e => handleKeyChange(e.target.value)}
              helperText="Латинские буквы и подчёркивание. Используется как идентификатор."
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Тип поля</InputLabel>
              <Select
                label="Тип поля"
                value={field.type}
                onChange={e => onChange({ type: e.target.value as FieldDefinition['type'] })}
              >
                {FIELD_TYPES.map(t => (
                  <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={field.required}
                  onChange={e => onChange({ required: e.target.checked })}
                />
              }
              label="Обязательное поле"
            />

            {field.type === 'select' && (
              <>
                <Divider />
                <FieldOptionsEditor
                  options={field.options ?? []}
                  bitrixField={
                    field.bitrix_field_type === 'list' && field.bitrix_field_id
                      ? { field_id: field.bitrix_field_id, title: '', type: 'list', is_required: false }
                      : null
                  }
                  bitrixValueMapping={field.bitrix_value_mapping ?? []}
                  onChange={(options, mapping) => onChange({ options, bitrix_value_mapping: mapping })}
                />
              </>
            )}
          </Box>
        )}

        {tab === 1 && hasBitrix && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Выберите соответствующее поле в Bitrix24. При синхронизации значение будет отправлено в это поле.
            </Typography>

            <BitrixFieldSelector
              entityType={entityType}
              value={field.bitrix_field_id ?? null}
              onChange={handleBitrixFieldChange}
            />

            {field.bitrix_field_id && (
              <TextField
                label="Тип поля Bitrix24"
                size="small"
                fullWidth
                value={field.bitrix_field_type ?? ''}
                InputProps={{ readOnly: true }}
                helperText="Определяется автоматически при выборе поля"
              />
            )}

            {field.type === 'select' && field.bitrix_field_type === 'list' && (
              <Typography variant="caption" color="text.secondary">
                Перейдите на вкладку «Основные» чтобы настроить маппинг значений.
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default FieldSettingsDrawer;
