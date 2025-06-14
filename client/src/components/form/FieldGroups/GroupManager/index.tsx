import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { FormField } from '../../../../types';
import { GroupConfig } from '../types';
import { CollapsibleGroup } from '../CollapsibleGroup';
import { useGroupManager } from './hooks/useGroupManager';
import FormFieldComponent from '../../../form/FormField';

interface GroupManagerProps {
  fields: FormField[];
  formData: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  config?: Partial<GroupConfig>;
  onGroupToggle?: (groupId: string, isCollapsed: boolean) => void;
  compact?: boolean;
}

export const GroupManager: React.FC<GroupManagerProps> = ({
  fields,
  formData,
  onChange,
  config = {},
  onGroupToggle,
  compact = false
}) => {
  const {
    fieldGroups,
    ungroupedFields,
    groupConfig,
    toggleGroup
  } = useGroupManager({
    fields,
    config,
    onGroupToggle
  });

  if (!groupConfig.enableGrouping) {
    // Если группировка отключена, показываем поля как обычно
    return (
      <Stack spacing={compact ? 0.5 : 1}>
        {fields.map((field) => (
          <FormFieldComponent
            key={field._id || field.name}
            field={field}
            value={formData[field.name] || ''}
            onChange={(value) => onChange(field.name, value)}
            compact={compact}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Box>
      {/* Группированные поля */}
      {fieldGroups.map((group) => (
        <CollapsibleGroup
          key={group.id}
          group={group}
          onToggle={toggleGroup}
          compact={true}
          showFieldCount={true}
          elevation={0}
        >
          <Stack spacing={compact ? 0.5 : 1}>
            {group.fields.map((field) => (
              <FormFieldComponent
                key={field._id || field.name}
                field={field}
                value={formData[field.name] || ''}
                onChange={(value) => onChange(field.name, value)}
                compact={true}
              />
            ))}
          </Stack>
        </CollapsibleGroup>
      ))}

      {/* Разделители теперь управляют группировкой и не отображаются отдельно */}

      {/* Негруппированные поля */}
      {ungroupedFields.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ ml: 0.5, mb: 1 }}>
            Дополнительные поля
          </Typography>
          <Stack spacing={compact ? 0.5 : 1}>
            {ungroupedFields.map((field) => (
              <FormFieldComponent
                key={field._id || field.name}
                field={field}
                value={formData[field.name] || ''}
                onChange={(value) => onChange(field.name, value)}
                compact={true}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}; 