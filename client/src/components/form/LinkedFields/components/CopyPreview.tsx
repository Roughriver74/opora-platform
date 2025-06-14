import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Collapse,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { CopyPreview as CopyPreviewType } from '../types';

interface CopyPreviewProps {
  preview: CopyPreviewType;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

export const CopyPreview: React.FC<CopyPreviewProps> = ({
  preview,
  expanded = false,
  onToggleExpanded
}) => {
  const { operation, changes } = preview;
  const hasOverwrites = changes.some(change => change.isOverwrite);
  const totalChanges = changes.length;

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'Да' : 'Нет';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  };

  const getChangeTypeColor = (isOverwrite: boolean) => {
    return isOverwrite ? 'warning' : 'success';
  };

  const getChangeTypeIcon = (isOverwrite: boolean) => {
    return isOverwrite ? <WarningIcon fontSize="small" /> : <CheckIcon fontSize="small" />;
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Заголовок с общей информацией */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: 1,
          borderColor: 'divider'
        }}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight="medium">
            Копирование: {operation.fromSection} → {operation.toSection}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalChanges} полей будут изменены
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {hasOverwrites && (
            <Chip
              icon={<WarningIcon />}
              label={`${changes.filter(c => c.isOverwrite).length} перезаписей`}
              color="warning"
              size="small"
            />
          )}
          
          {onToggleExpanded && (
            <IconButton 
              onClick={onToggleExpanded}
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            >
              <ExpandIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Предупреждения */}
      {hasOverwrites && expanded && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Некоторые поля уже содержат данные и будут перезаписаны. 
          Проверьте изменения перед подтверждением.
        </Alert>
      )}

      {/* Детальная таблица изменений */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="40px">Тип</TableCell>
                  <TableCell>Поле</TableCell>
                  <TableCell>Текущее значение</TableCell>
                  <TableCell>Новое значение</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {changes.map((change, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Chip
                        icon={getChangeTypeIcon(change.isOverwrite)}
                        size="small"
                        color={getChangeTypeColor(change.isOverwrite)}
                        variant="outlined"
                        sx={{ minWidth: 'auto', '& .MuiChip-label': { px: 0 } }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {change.fieldLabel}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {change.fieldName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        color={change.isOverwrite ? "text.primary" : "text.secondary"}
                        sx={{ 
                          fontStyle: change.isOverwrite ? 'normal' : 'italic',
                          textDecoration: change.isOverwrite ? 'line-through' : 'none'
                        }}
                      >
                        {formatValue(change.oldValue)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        fontWeight="medium"
                        color="success.main"
                      >
                        {formatValue(change.newValue)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Collapse>

      {/* Компактное представление */}
      {!expanded && totalChanges > 0 && (
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {changes.slice(0, 3).map((change, index) => (
            <Chip
              key={index}
              label={change.fieldLabel}
              size="small"
              variant="outlined"
              color={change.isOverwrite ? 'warning' : 'primary'}
            />
          ))}
          {changes.length > 3 && (
            <Chip
              label={`+${changes.length - 3} еще`}
              size="small"
              variant="outlined"
              color="default"
            />
          )}
        </Box>
      )}
    </Box>
  );
}; 