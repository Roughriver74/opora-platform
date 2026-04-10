// frontend/src/components/FormBuilder/FieldPreviewDialog.tsx
import {
  Box, Dialog, DialogContent, DialogTitle,
  FormControl, FormControlLabel, InputLabel,
  MenuItem, Select, Switch, TextField, Typography,
} from '@mui/material';
import React from 'react';
import { EntityType, ENTITY_TYPE_LABELS, FieldDefinition } from './types';

const STANDARD_FIELDS: Record<EntityType, Array<{ label: string; type: string }>> = {
  visit: [
    { label: 'Компания', type: 'text' },
    { label: 'Дата визита', type: 'date' },
  ],
  clinic: [
    { label: 'Название компании', type: 'text' },
    { label: 'ИНН', type: 'text' },
  ],
  doctor: [{ label: 'ФИО', type: 'text' }],
  contact: [
    { label: 'ФИО', type: 'text' },
    { label: 'Тип контакта', type: 'text' },
  ],
  network_clinic: [{ label: 'Название клиники', type: 'text' }],
};

function renderField(field: { label: string; type: string; options?: string[] }, disabled = true) {
  switch (field.type) {
    case 'textarea':
      return <TextField label={field.label} multiline rows={3} fullWidth disabled={disabled} size="small" />;
    case 'select':
      return (
        <FormControl fullWidth size="small" disabled={disabled}>
          <InputLabel>{field.label}</InputLabel>
          <Select label={field.label} value="">
            {(field.options ?? []).map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>
      );
    case 'checkbox':
      return <FormControlLabel control={<Switch disabled={disabled} />} label={field.label} />;
    case 'date':
      return <TextField label={field.label} type="date" fullWidth disabled={disabled} size="small" InputLabelProps={{ shrink: true }} />;
    case 'number':
      return <TextField label={field.label} type="number" fullWidth disabled={disabled} size="small" />;
    default:
      return <TextField label={field.label} fullWidth disabled={disabled} size="small" />;
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  entityType: EntityType;
  fields: FieldDefinition[];
}

const FieldPreviewDialog: React.FC<Props> = ({ open, onClose, entityType, fields }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Предпросмотр формы: {ENTITY_TYPE_LABELS[entityType]}</DialogTitle>
    <DialogContent>
      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
        Стандартные поля (всегда присутствуют)
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        {STANDARD_FIELDS[entityType].map(f => (
          <Box key={f.label}>{renderField(f)}</Box>
        ))}
      </Box>

      {fields.length > 0 && (
        <>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Настраиваемые поля
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {fields.map(f => (
              <Box key={f.key}>{renderField(f)}</Box>
            ))}
          </Box>
        </>
      )}
    </DialogContent>
  </Dialog>
);

export default FieldPreviewDialog;
