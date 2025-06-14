import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Badge,
  Tooltip
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  ArrowForward as ArrowIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { CopyPreview } from '../types';

interface CopyButtonProps {
  sourceSection: string;
  targetSections: string[];
  onCopyRequest: (fromSection: string, toSection: string) => void;
  onPreviewRequest: (fromSection: string, toSection: string) => CopyPreview | null;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'contained' | 'outlined' | 'text';
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  sourceSection,
  targetSections,
  onCopyRequest,
  onPreviewRequest,
  disabled = false,
  size = 'medium',
  variant = 'outlined'
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (targetSections.length === 1) {
      // Если только одна целевая секция, копируем сразу
      onCopyRequest(sourceSection, targetSections[0]);
    } else {
      // Показываем меню выбора
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (targetSection: string) => {
    onCopyRequest(sourceSection, targetSection);
    handleClose();
  };

  const getPreviewForSection = (targetSection: string): CopyPreview | null => {
    return onPreviewRequest(sourceSection, targetSection);
  };

  if (targetSections.length === 0) {
    return (
      <Tooltip title="Нет доступных секций для копирования">
        <span>
          <Button
            disabled
            size={size}
            variant={variant}
            startIcon={<CopyIcon />}
          >
            Копировать поля
          </Button>
        </span>
      </Tooltip>
    );
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={disabled}
        size={size}
        variant={variant}
        startIcon={<CopyIcon />}
        endIcon={targetSections.length > 1 ? <ArrowIcon /> : undefined}
        sx={{ minWidth: 160 }}
      >
        Копировать поля
        {targetSections.length > 1 && ` (${targetSections.length})`}
      </Button>

      {targetSections.length > 1 && (
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          PaperProps={{
            sx: { minWidth: 250 }
          }}
        >
          <MenuItem disabled>
            <ListItemText 
              primary="Выберите секцию для копирования"
              primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
            />
          </MenuItem>
          <Divider />
          
          {targetSections.map((targetSection) => {
            const preview = getPreviewForSection(targetSection);
            const hasChanges = preview && preview.changes.length > 0;
            const hasWarnings = preview && preview.changes.some(change => change.isOverwrite);

            return (
              <MenuItem
                key={targetSection}
                onClick={() => handleMenuItemClick(targetSection)}
                disabled={!hasChanges}
              >
                <ListItemIcon>
                  {hasWarnings && (
                    <Tooltip title="Некоторые поля будут перезаписаны">
                      <WarningIcon color="warning" fontSize="small" />
                    </Tooltip>
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary={targetSection}
                  secondary={hasChanges ? `${preview.changes.length} полей` : 'Нет данных для копирования'}
                />
                {hasChanges && (
                  <Badge
                    badgeContent={preview.changes.length}
                    color={hasWarnings ? 'warning' : 'primary'}
                    sx={{ ml: 1 }}
                  />
                )}
              </MenuItem>
            );
          })}
        </Menu>
      )}
    </>
  );
}; 