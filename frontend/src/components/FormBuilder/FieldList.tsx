// frontend/src/components/FormBuilder/FieldList.tsx
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Typography } from '@mui/material';
import React from 'react';
import FieldCard from './FieldCard';
import { FieldDefinition } from './types';

interface Props {
  fields: FieldDefinition[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onReorder: (fields: FieldDefinition[]) => void;
  onAdd: () => void;
}

const FieldList: React.FC<Props> = ({
  fields, selectedIndex, onSelect, onDelete, onReorder, onAdd,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(f => f.key === active.id);
      const newIndex = fields.findIndex(f => f.key === over.id);
      onReorder(arrayMove(fields, oldIndex, newIndex));
    }
  };

  return (
    <Box>
      {fields.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Полей нет. Нажмите «+ Добавить поле» чтобы начать.
        </Typography>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map(f => f.key)} strategy={verticalListSortingStrategy}>
          {fields.map((field, index) => (
            <FieldCard
              key={field.key}
              field={field}
              selected={selectedIndex === index}
              onSelect={() => onSelect(index)}
              onDelete={() => onDelete(index)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        fullWidth
        onClick={onAdd}
        sx={{
          mt: 1,
          borderStyle: 'dashed',
          color: 'text.secondary',
          borderColor: 'divider',
          '&:hover': { borderStyle: 'dashed', borderColor: 'primary.main', color: 'primary.main' },
        }}
      >
        Добавить поле
      </Button>
    </Box>
  );
};

export default FieldList;
