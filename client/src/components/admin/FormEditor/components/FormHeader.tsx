import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Stack,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { SaveStatus } from '../types';

interface FormHeaderProps {
  isEditing: boolean;
  saveStatus: SaveStatus;
  hasChanges: boolean;
  saving: boolean;
  autoSaving: boolean;
  onSave: () => void;
  onBack?: () => void;
}

export const FormHeader: React.FC<FormHeaderProps> = ({
  isEditing,
  saveStatus,
  hasChanges,
  saving,
  autoSaving,
  onSave,
  onBack,
}) => {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
      <Box>
        <Typography variant="h5" component="h1" gutterBottom sx={{ mb: 1 }}>
          {isEditing ? 'Редактирование формы' : 'Создание новой формы'}
        </Typography>
        
        <Box display="flex" alignItems="center" gap={1.5}>
          <Chip
            label={saveStatus.text}
            color={saveStatus.color}
            size="small"
            variant={hasChanges ? 'filled' : 'outlined'}
            sx={{ height: 20, fontSize: '0.75rem' }}
          />
          
          {autoSaving && (
            <Box display="flex" alignItems="center" gap={0.75}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Автосохранение...
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      
      <Stack direction="row" spacing={1.5}>
        {onBack && (
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            disabled={saving || autoSaving}
            size="small"
            sx={{ fontSize: '0.875rem' }}
          >
            К списку форм
          </Button>
        )}
        
        <Button
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={onSave}
          disabled={saving || autoSaving}
          size="small"
          sx={{ fontSize: '0.875rem' }}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </Stack>
    </Stack>
  );
}; 