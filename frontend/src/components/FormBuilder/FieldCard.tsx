// frontend/src/components/FormBuilder/FieldCard.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Box, Chip, IconButton, Paper, Typography } from '@mui/material';
import React from 'react';
import { FIELD_TYPES, FieldDefinition } from './types';

interface Props {
  field: FieldDefinition;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const FieldCard: React.FC<Props> = ({ field, index, selected, onSelect, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.key });

  const typeLabel = FIELD_TYPES.find(t => t.value === field.type)?.label ?? field.type;

  return (
    <Paper
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      elevation={isDragging ? 6 : selected ? 3 : 1}
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1.5,
        mb: 1,
        cursor: 'pointer',
        border: selected ? '1px solid' : '1px solid transparent',
        borderColor: selected ? 'primary.main' : 'transparent',
        opacity: isDragging ? 0.5 : 1,
        transition: 'border-color 0.15s',
        '&:hover': { borderColor: 'primary.light' },
      }}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <Box
        {...attributes}
        {...listeners}
        sx={{ cursor: 'grab', color: 'text.disabled', mr: 1, display: 'flex' }}
        onClick={e => e.stopPropagation()}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>

      {/* Label */}
      <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
        {field.label || <em style={{ opacity: 0.5 }}>Без названия</em>}
      </Typography>

      {/* Badges */}
      <Box sx={{ display: 'flex', gap: 0.5, mr: 1, flexWrap: 'nowrap' }}>
        <Chip label={typeLabel} size="small" color="primary" variant="outlined" />
        {field.required && <Chip label="Обязательное" size="small" color="error" variant="outlined" />}
        <Chip
          label="B24"
          size="small"
          color={field.bitrix_field_id ? 'success' : 'default'}
          variant="outlined"
          title={field.bitrix_field_id ? `Привязано: ${field.bitrix_field_id}` : 'Не привязано к Bitrix24'}
        />
      </Box>

      {/* Delete */}
      <IconButton
        size="small"
        color="error"
        onClick={e => { e.stopPropagation(); onDelete(); }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
};

export default FieldCard;
