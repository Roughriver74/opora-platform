import React from 'react';
import {
  TableCell,
  TableRow,
  IconButton,
  Chip,
  Typography,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountCircle as AccountCircleIcon
} from '@mui/icons-material';
import { User } from '../../../../../types/user';

interface UserRowProps {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
}

export const UserRow: React.FC<UserRowProps> = ({ user, onEdit, onDelete }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Администратор' : 'Пользователь';
  };

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'primary' : 'default';
  };

  const getStatusLabel = (status: string) => {
    return status === 'active' ? 'Активный' : 'Неактивный';
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'success' : 'error';
  };

  const displayName = user.fullName || 
    (user.firstName || user.lastName ? 
      `${user.firstName || ''} ${user.lastName || ''}`.trim() : 
      'Без имени'
    );

  return (
    <TableRow hover>
      <TableCell>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AccountCircleIcon color="disabled" />
          <div>
            <Typography variant="body2" fontWeight="medium">
              {displayName}
            </Typography>
            {user.bitrix_id && (
              <Typography variant="caption" color="text.secondary">
                Битрикс ID: {user.bitrix_id}
              </Typography>
            )}
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2">
          {user.email}
        </Typography>
      </TableCell>
      
      <TableCell>
        <Chip
          label={getRoleLabel(user.role)}
          color={getRoleColor(user.role) as any}
          size="small"
          variant="outlined"
        />
      </TableCell>
      
      <TableCell>
        <Chip
          label={getStatusLabel(user.status)}
          color={getStatusColor(user.status) as any}
          size="small"
          variant="filled"
        />
      </TableCell>
      
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {user.bitrix_id || '—'}
        </Typography>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {user.phone || '—'}
        </Typography>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {formatDate(user.createdAt)}
        </Typography>
      </TableCell>
      
      <TableCell align="center">
        <div style={{ display: 'flex', gap: 4 }}>
          <Tooltip title="Редактировать">
            <IconButton
              size="small"
              onClick={onEdit}
              color="primary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Удалить">
            <IconButton
              size="small"
              onClick={onDelete}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}; 