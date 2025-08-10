import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar
} from '@mui/material';
import { UsersTable } from '../../components/admin/Users/UsersTable';
import { UserForm } from '../../components/admin/Users/UserForm';
import { apiService } from '../../services/apiService';
import { User, SyncBitrixResponse } from '../../types/user';

export const UsersPage: React.FC = () => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Обработчик добавления пользователя
  const handleAddUser = () => {
    setEditingUser(null);
    setUserFormOpen(true);
  };

  // Обработчик редактирования пользователя
  const handleEditUser = async (id: string) => {
    try {
      const response = await apiService.get(`/api/users/${id}`);
      if (response.data.success) {
        setEditingUser(response.data.data);
        setUserFormOpen(true);
      } else {
        setSnackbar({
          open: true,
          message: 'Не удалось загрузить пользователя',
          severity: 'error'
        });
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Ошибка загрузки пользователя',
        severity: 'error'
      });
    }
  };

  // Обработчик сохранения пользователя
  const handleSaveUser = (savedUser: User) => {
    setSnackbar({
      open: true,
      message: editingUser ? 'Пользователь успешно обновлен' : 'Пользователь успешно создан',
      severity: 'success'
    });
    setUserFormOpen(false);
    setEditingUser(null);
    // Таблица обновится автоматически через хук
  };

  // Закрытие формы пользователя
  const handleCloseUserForm = () => {
    setUserFormOpen(false);
    setEditingUser(null);
  };

  // Обработчик удаления пользователя
  const handleDeleteUser = (id: string) => {
    // Найти пользователя в таблице (это временное решение)
    // В реальном приложении нужно получить пользователя по API
    setUserToDelete({ _id: id } as User);
    setDeleteDialogOpen(true);
  };

  // Подтверждение удаления
  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const response = await apiService.delete(`/api/users/${userToDelete._id}`);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Пользователь успешно удален',
          severity: 'success'
        });
        // Таблица обновится автоматически через хук
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || 'Ошибка удаления пользователя',
          severity: 'error'
        });
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Ошибка удаления пользователя',
        severity: 'error'
      });
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // Обработчик синхронизации с Битрикс24
  const handleSyncBitrix = () => {
    setSyncDialogOpen(true);
  };

  // Подтверждение синхронизации
  const confirmSync = async () => {
    setSyncLoading(true);

    try {
      const response = await apiService.post('/api/users/sync/bitrix', {
        forceSync: false
      });
      
      const data: SyncBitrixResponse = response.data;

      if (data.success) {
        setSnackbar({
          open: true,
          message: `Синхронизация завершена. Создано: ${data.stats.created}, обновлено: ${data.stats.updated}, ошибок: ${data.stats.errors}`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: data.message || 'Ошибка синхронизации',
          severity: 'error'
        });
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Ошибка синхронизации с Битрикс24',
        severity: 'error'
      });
    } finally {
      setSyncLoading(false);
      setSyncDialogOpen(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <UsersTable
        onAddUser={handleAddUser}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
        onSyncBitrix={handleSyncBitrix}
      />

      {/* Диалог подтверждения удаления */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Подтверждение удаления
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Вы уверены, что хотите удалить этого пользователя? 
            Это действие нельзя отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Отмена
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            autoFocus
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения синхронизации */}
      <Dialog
        open={syncDialogOpen}
        onClose={() => !syncLoading && setSyncDialogOpen(false)}
        aria-labelledby="sync-dialog-title"
        aria-describedby="sync-dialog-description"
      >
        <DialogTitle id="sync-dialog-title">
          Синхронизация с Битрикс24
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="sync-dialog-description">
            Синхронизировать пользователей с Битрикс24? 
            Будут созданы новые пользователи и обновлены существующие.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setSyncDialogOpen(false)}
            disabled={syncLoading}
          >
            Отмена
          </Button>
          <Button 
            onClick={confirmSync} 
            color="primary" 
            variant="contained"
            disabled={syncLoading}
            autoFocus
          >
            {syncLoading ? 'Синхронизация...' : 'Синхронизировать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Форма пользователя */}
      <UserForm
        open={userFormOpen}
        user={editingUser}
        onClose={handleCloseUserForm}
        onSave={handleSaveUser}
      />

      {/* Snackbar для уведомлений */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}; 