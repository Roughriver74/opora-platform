import React, { useState } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { FormField } from '../../../../types';

interface LinkedFieldsSettingsProps {
  formField: FormField;
  availableFields: FormField[];
  onChange: (field: FormField) => void;
}

interface FieldMapping {
  targetFieldName: string;
  targetFieldLabel: string;
  copyDirection: 'from' | 'to' | 'both';
}

export const LinkedFieldsSettings: React.FC<LinkedFieldsSettingsProps> = ({
  formField,
  availableFields,
  onChange
}) => {
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [newMapping, setNewMapping] = useState<FieldMapping>({
    targetFieldName: '',
    targetFieldLabel: '',
    copyDirection: 'both'
  });

  const linkedFields = formField.linkedFields || { enabled: false, mappings: [] };

  // Фильтруем доступные поля (исключаем текущее поле и поля типа header/divider)
  const compatibleFields = availableFields.filter(field => 
    field.name !== formField.name && 
    !['header', 'divider'].includes(field.type) &&
    areFieldTypesCompatible(formField.type, field.type)
  );

  const handleEnabledChange = (enabled: boolean) => {
    onChange({
      ...formField,
      linkedFields: {
        ...linkedFields,
        enabled
      }
    });
  };

  const handleAddMapping = () => {
    if (!newMapping.targetFieldName) return;

    const targetField = availableFields.find(f => f.name === newMapping.targetFieldName);
    if (!targetField) return;

    const updatedMappings = [...linkedFields.mappings, {
      ...newMapping,
      targetFieldLabel: targetField.label
    }];

    onChange({
      ...formField,
      linkedFields: {
        ...linkedFields,
        mappings: updatedMappings
      }
    });

    setNewMapping({
      targetFieldName: '',
      targetFieldLabel: '',
      copyDirection: 'both'
    });
    setMappingDialogOpen(false);
  };

  const handleRemoveMapping = (index: number) => {
    const updatedMappings = linkedFields.mappings.filter((_, i) => i !== index);
    onChange({
      ...formField,
      linkedFields: {
        ...linkedFields,
        mappings: updatedMappings
      }
    });
  };

  const getDirectionLabel = (direction: string) => {
    switch (direction) {
      case 'from': return 'Копировать из этого поля';
      case 'to': return 'Копировать в это поле';
      case 'both': return 'Двунаправленное копирование';
      default: return direction;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'from': return 'primary';
      case 'to': return 'secondary';
      case 'both': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <LinkIcon color="primary" />
        <Typography variant="h6">
          Связанные поля
        </Typography>
        <Tooltip title="Настройка автоматического копирования данных между полями">
          <IconButton size="small">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={linkedFields.enabled}
            onChange={(e) => handleEnabledChange(e.target.checked)}
          />
        }
        label="Включить связанные поля"
      />

      {linkedFields.enabled && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Связи полей ({linkedFields.mappings.length})
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={() => setMappingDialogOpen(true)}
              variant="outlined"
              size="small"
              disabled={compatibleFields.length === 0}
            >
              Добавить связь
            </Button>
          </Box>

          {compatibleFields.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Нет совместимых полей для создания связей. 
              Убедитесь, что в форме есть другие поля подходящего типа.
            </Alert>
          )}

          {linkedFields.mappings.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Связи не настроены. Нажмите "Добавить связь" для создания первой связи.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {linkedFields.mappings.map((mapping, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper'
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {mapping.targetFieldLabel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {mapping.targetFieldName}
                    </Typography>
                  </Box>
                  <Chip
                    label={getDirectionLabel(mapping.copyDirection)}
                    color={getDirectionColor(mapping.copyDirection) as any}
                    size="small"
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveMapping(index)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Диалог добавления связи */}
      <Dialog open={mappingDialogOpen} onClose={() => setMappingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить связь поля</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              options={compatibleFields}
              getOptionLabel={(option) => `${option.label} (${option.name})`}
              value={compatibleFields.find(f => f.name === newMapping.targetFieldName) || null}
              onChange={(_, value) => {
                setNewMapping({
                  ...newMapping,
                  targetFieldName: value?.name || '',
                  targetFieldLabel: value?.label || ''
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Связанное поле"
                  placeholder="Выберите поле для связи"
                  fullWidth
                />
              )}
            />

            <FormControl fullWidth>
              <InputLabel>Направление копирования</InputLabel>
              <Select
                value={newMapping.copyDirection}
                onChange={(e) => setNewMapping({
                  ...newMapping,
                  copyDirection: e.target.value as 'from' | 'to' | 'both'
                })}
                label="Направление копирования"
              >
                <MenuItem value="both">Двунаправленное копирование</MenuItem>
                <MenuItem value="from">Копировать из этого поля</MenuItem>
                <MenuItem value="to">Копировать в это поле</MenuItem>
              </Select>
            </FormControl>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Двунаправленное:</strong> Поля могут копировать данные друг в друга<br/>
                <strong>Из этого поля:</strong> Данные копируются из "{formField.label}" в связанное поле<br/>
                <strong>В это поле:</strong> Данные копируются из связанного поля в "{formField.label}"
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMappingDialogOpen(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleAddMapping}
            variant="contained"
            disabled={!newMapping.targetFieldName}
          >
            Добавить связь
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Вспомогательная функция для проверки совместимости типов полей
function areFieldTypesCompatible(type1: string, type2: string): boolean {
  // Точное совпадение
  if (type1 === type2) return true;

  // Текстовые поля совместимы
  const textTypes = ['text', 'textarea'];
  if (textTypes.includes(type1) && textTypes.includes(type2)) return true;

  // Поля выбора совместимы
  const selectTypes = ['select', 'autocomplete', 'radio'];
  if (selectTypes.includes(type1) && selectTypes.includes(type2)) return true;

  // Числовые поля могут копироваться в текстовые
  if (type1 === 'number' && textTypes.includes(type2)) return true;
  if (type2 === 'number' && textTypes.includes(type1)) return true;

  return false;
} 