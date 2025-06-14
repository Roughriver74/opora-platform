import React from 'react';
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  Paper,
  Divider,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { FieldGroup } from '../types';
import { useCollapsibleGroup } from './hooks/useCollapsibleGroup';

interface CollapsibleGroupProps {
  group: FieldGroup;
  children: React.ReactNode;
  onToggle?: (groupId: string, isCollapsed: boolean) => void;
  compact?: boolean;
  showFieldCount?: boolean;
  elevation?: number;
}

export const CollapsibleGroup: React.FC<CollapsibleGroupProps> = ({
  group,
  children,
  onToggle,
  compact = false,
  showFieldCount = true,
  elevation = 1
}) => {
  const { isCollapsed, toggleCollapsed, getGroupIcon } = useCollapsibleGroup({
    group,
    onToggle
  });

  const groupIcon = getGroupIcon();
  const fieldCount = group.fields.length;

  return (
    <Paper 
      elevation={compact ? 0 : elevation} 
      sx={{ 
        mb: compact ? 1 : 2,
        borderRadius: compact ? 1 : 2,
        overflow: 'hidden',
        border: compact 
          ? '1px solid'
          : group.color ? `2px solid ${group.color}` : 'none',
        borderColor: compact ? 'divider' : undefined
      }}
    >
      {/* Заголовок группы */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: compact ? 1 : 2,
          bgcolor: compact 
            ? 'grey.50' 
            : group.color ? `${group.color}15` : 'background.paper',
          cursor: group.isCollapsible ? 'pointer' : 'default',
          minHeight: compact ? 36 : 48,
          '&:hover': group.isCollapsible ? {
            bgcolor: compact 
              ? 'grey.100' 
              : group.color ? `${group.color}25` : 'action.hover'
          } : {}
        }}
        onClick={group.isCollapsible ? toggleCollapsed : undefined}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: compact ? 1 : 1.5, flex: 1 }}>
          {/* Иконка группы - только если не компактный режим */}
          {groupIcon && !compact && (
            <Box sx={{ 
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              {groupIcon}
            </Box>
          )}

          {/* Название */}
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant={compact ? 'body2' : 'subtitle1'} 
              component="h3"
              sx={{ 
                fontWeight: compact ? 500 : 600,
                color: group.color || 'text.primary',
                lineHeight: compact ? 1.2 : 1.3
              }}
            >
              {group.title}
            </Typography>
            
            {/* Описание только в не компактном режиме */}
            {group.description && !compact && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ mt: 0.25, display: 'block' }}
              >
                {group.description}
              </Typography>
            )}
          </Box>

          {/* Счетчик полей */}
          {showFieldCount && fieldCount > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: compact ? '0.75rem' : '0.8rem',
                fontWeight: 500
              }}
            >
              {fieldCount} {fieldCount === 1 ? 'поле' : 'полей'}
            </Typography>
          )}

          {/* Информация о группе - только для компактного режима с описанием */}
          {group.description && compact && (
            <Tooltip title={group.description} arrow>
              <IconButton size="small" sx={{ p: 0.25 }}>
                <InfoIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Кнопка сворачивания */}
        {group.isCollapsible && (
          <IconButton 
            size={compact ? "small" : "medium"}
            sx={{
              transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.2s ease-in-out',
              color: group.color || 'action.active',
              p: compact ? 0.25 : 1
            }}
          >
            <ExpandMoreIcon fontSize={compact ? "small" : "medium"} />
          </IconButton>
        )}
      </Box>

      {/* Разделитель - только если не компактный режим */}
      {!isCollapsed && !compact && <Divider />}

      {/* Содержимое группы */}
      <Collapse in={!isCollapsed} timeout={300}>
        <Box sx={{ 
          px: compact ? 1 : 2,
          py: compact ? 0.5 : 1.5,
          '& > *:last-child': {
            mb: 0
          },
          '& > *:not(:last-child)': {
            mb: compact ? 0.5 : 1
          }
        }}>
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
}; 