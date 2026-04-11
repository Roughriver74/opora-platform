import React from 'react';
import { Alert, AlertTitle, Box, Button, Chip, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';

interface SyncStatusAlertProps {
  syncStatus?: string;
  syncError?: string | null;
  lastSynced?: string | null;
  onRetrySync?: () => void;
  isSyncing?: boolean;
}

const SyncStatusAlert: React.FC<SyncStatusAlertProps> = ({
  syncStatus,
  syncError,
  lastSynced,
  onRetrySync,
  isSyncing = false,
}) => {
  if (!syncStatus) return null;

  // Only show alert for error status or if there's an error message
  if (syncStatus === 'error' || syncError) {
    return (
      <Alert
        severity="error"
        sx={{ mb: 2, borderRadius: 2 }}
        action={
          onRetrySync ? (
            <Button
              color="inherit"
              size="small"
              startIcon={<SyncIcon />}
              onClick={onRetrySync}
              disabled={isSyncing}
            >
              {isSyncing ? 'Синхронизация...' : 'Повторить'}
            </Button>
          ) : undefined
        }
      >
        <AlertTitle>Ошибка синхронизации с Bitrix24</AlertTitle>
        {syncError || 'Произошла ошибка при синхронизации данных.'}
      </Alert>
    );
  }

  // Show subtle info for pending status
  if (syncStatus === 'pending') {
    return (
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }} icon={<ScheduleIcon />}>
        Данные ожидают синхронизации с Bitrix24
      </Alert>
    );
  }

  return null;
};

export const SyncStatusChip: React.FC<{ syncStatus?: string; lastSynced?: string | null }> = ({
  syncStatus,
  lastSynced,
}) => {
  const getChipProps = () => {
    switch (syncStatus) {
      case 'synced':
        return { icon: <CheckCircleIcon />, label: 'Синхронизировано', color: 'success' as const };
      case 'pending':
        return { icon: <ScheduleIcon />, label: 'Ожидает синхронизации', color: 'warning' as const };
      case 'error':
        return { icon: <ErrorIcon />, label: 'Ошибка синхронизации', color: 'error' as const };
      default:
        return { label: syncStatus || 'Неизвестно', color: 'default' as const };
    }
  };

  const chipProps = getChipProps();
  const formattedDate = lastSynced
    ? new Date(lastSynced).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Chip size="small" variant="outlined" {...chipProps} />
      {formattedDate && (
        <Typography variant="caption" color="text.secondary">
          {formattedDate}
        </Typography>
      )}
    </Box>
  );
};

export default SyncStatusAlert;
