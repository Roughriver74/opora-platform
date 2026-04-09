import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Autocomplete,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useSnackbar } from 'notistack';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface User {
  id: number;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  bitrix_user_id: number;
  regions: string[];
}

interface UserForm {
  email: string;
  password?: string;
  is_active?: boolean;
  is_admin?: boolean;
  bitrix_user_id?: number;
  regions?: string[];
}

interface BitrixUser {
  id: number;
  email: string;
  name: string;
  last_name: string;
}

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserForm>({
    email: '',
    password: '',
    is_active: true,
    is_admin: false,
    bitrix_user_id: undefined,
    regions: [],
  });
  const [searchingBitrix, setSearchingBitrix] = useState(false);
  const [bitrixUser, setBitrixUser] = useState<BitrixUser | null>(null);

  const { data: users, isLoading, refetch } = useQuery<User[]>(
    ['users'],
    async () => {
      const response = await api.get('/users');
      return response.data;
    },
    {
      onError: (error: any) => {
        setError(error.response?.data?.detail || 'Ошибка при загрузке пользователей');
      },
    }
  );

  const { data: availableRegions = [] } = useQuery<string[]>(
    ['regions'],
    async () => {
      const response = await api.get('/regions');
      return response.data.regions || []; // Получаем поле regions из ответа API
    },
    {
      onError: (error: any) => {
        enqueueSnackbar('Ошибка при загрузке регионов: ' + (error.response?.data?.detail || 'Неизвестная ошибка'), { variant: 'error' });
      },
    }
  );

  const createUserMutation = useMutation(
    async (userData: UserForm) => {
      await api.post('/users', userData);
    },
    {
      onSuccess: () => {
        handleCloseDialog();
        refetch();
        enqueueSnackbar('Пользователь успешно создан', { variant: 'success' });
      },
      onError: (error: any) => {
        setError(error.response?.data?.detail || 'Ошибка при создании пользователя');
      },
    }
  );

  const updateUserMutation = useMutation(
    async (userData: UserForm & { id: number }) => {
      const { id, ...data } = userData;
      await api.put(`/users/${id}`, data);
    },
    {
      onSuccess: () => {
        handleCloseDialog();
        refetch();
        enqueueSnackbar('Пользователь успешно обновлен', { variant: 'success' });
      },
      onError: (error: any) => {
        setError(error.response?.data?.detail || 'Ошибка при обновлении пользователя');
      },
    }
  );

  const deleteUserMutation = useMutation(
    async (userId: number) => {
      await api.delete(`/users/${userId}`);
    },
    {
      onSuccess: () => {
        enqueueSnackbar('Пользователь успешно удален', { variant: 'success' });
        refetch();
      },
      onError: (error: any) => {
        setError(error.response?.data?.detail || 'Ошибка при удалении пользователя');
      },
    }
  );

  const searchBitrixUserMutation = useMutation(
    async (email: string) => {
      const response = await api.get(`/users/search-bitrix?email=${encodeURIComponent(email)}`);
      return response.data;
    },
    {
      onSuccess: (data) => {
        setSearchingBitrix(false);
        if (data.found) {
          setBitrixUser(data.user);
          setFormData({
            ...formData,
            bitrix_user_id: data.user.id,
          });
          enqueueSnackbar('Пользователь найден в Bitrix24', { variant: 'success' });
        } else {
          setBitrixUser(null);
          enqueueSnackbar('Пользователь не найден в Bitrix24. Введите ID вручную.', { variant: 'warning' });
        }
      },
      onError: (error: any) => {
        setSearchingBitrix(false);
        setBitrixUser(null);
        setError(error.response?.data?.detail || 'Ошибка при поиске пользователя в Bitrix24');
      },
    }
  );

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(true);
      setFormData({
        email: user.email,
        password: '',
        is_active: user.is_active,
        is_admin: user.is_admin,
        bitrix_user_id: user.bitrix_user_id,
        regions: user.regions || [],
      });
    } else {
      setEditingUser(false);
      setFormData({
        email: '',
        password: '',
        is_active: true,
        is_admin: false,
        bitrix_user_id: undefined,
        regions: [],
      });
    }
    setBitrixUser(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(false);
    setError(null);
    setBitrixUser(null);
  };

  const handleSearchBitrixUser = () => {
    if (!formData.email) {
      setError('Введите email для поиска пользователя в Bitrix24');
      return;
    }
    
    setSearchingBitrix(true);
    searchBitrixUserMutation.mutate(formData.email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email) {
      setError('Пожалуйста, заполните email');
      return;
    }

    // Не требуем пароль при редактировании
    if (!editingUser && !formData.password) {
      setError('Пожалуйста, укажите пароль');
      return;
    }

    if (!formData.bitrix_user_id) {
      setError('Пожалуйста, укажите ID пользователя в Bitrix24');
      return;
    }

    if (editingUser) {
      const user = users?.find((u) => u.email === formData.email);
      if (user) {
        // Если пароль пустой, создаем новый объект без него
        const dataToSend = formData.password 
          ? { ...formData } 
          : { 
              email: formData.email,
              is_active: formData.is_active,
              is_admin: formData.is_admin,
              bitrix_user_id: formData.bitrix_user_id,
              regions: formData.regions
            };
        updateUserMutation.mutate({ ...dataToSend, id: user.id });
      } else {
        setError('Пользователь не найден');
      }
    } else {
      createUserMutation.mutate(formData);
    }
  };

  const handleDeleteUser = (userId: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => handleOpenDialog()}
        sx={{ mb: 3 }}
      >
        Создать пользователя
      </Button>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Управление пользователями
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Активен</TableCell>
                  <TableCell>Администратор</TableCell>
                  <TableCell>Bitrix ID</TableCell>
                  <TableCell>Регионы</TableCell>
                  <TableCell>Дата создания</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.is_active ? 'Да' : 'Нет'}</TableCell>
                    <TableCell>{user.is_admin ? 'Да' : 'Нет'}</TableCell>
                    <TableCell>{user.bitrix_user_id}</TableCell>
                    <TableCell>
                      {user.regions && user.regions.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {user.regions.map((region) => (
                            <Chip key={region} label={region} size="small" />
                          ))}
                        </Box>
                      ) : (
                        'Не назначены'
                      )}
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleOpenDialog(user)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteUser(user.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Редактирование пользователя' : 'Создание пользователя'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                margin="normal"
                required
                disabled={editingUser}
              />
              {!editingUser && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSearchBitrixUser}
                  sx={{ mt: 3, ml: 1 }}
                  disabled={searchingBitrix || !formData.email}
                  startIcon={searchingBitrix ? <CircularProgress size={20} /> : <SearchIcon />}
                >
                  {searchingBitrix ? 'Поиск...' : 'Найти'}
                </Button>
              )}
            </Box>

            {bitrixUser && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Найден пользователь: {bitrixUser.name} {bitrixUser.last_name} (ID: {bitrixUser.id})
              </Alert>
            )}

            <TextField
              fullWidth
              label="Bitrix ID"
              type="number"
              value={formData.bitrix_user_id || ''}
              onChange={(e) => setFormData({ ...formData, bitrix_user_id: parseInt(e.target.value) || undefined })}
              margin="normal"
              required
              helperText="ID пользователя в Bitrix24"
            />

            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              margin="normal"
              required={!editingUser}
              helperText={editingUser ? "Оставьте пустым, чтобы не менять пароль" : ""}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Активен</InputLabel>
              <Select
                value={formData.is_active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
              >
                <MenuItem value="true">Да</MenuItem>
                <MenuItem value="false">Нет</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Администратор</InputLabel>
              <Select
                value={formData.is_admin ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_admin: e.target.value === 'true' })}
              >
                <MenuItem value="true">Да</MenuItem>
                <MenuItem value="false">Нет</MenuItem>
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              id="regions-selection"
              options={availableRegions}
              value={formData.regions || []}
              onChange={(event, newValue) => {
                setFormData({ ...formData, regions: newValue });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  label="Назначенные регионы"
                  placeholder="Выберите регионы"
                  fullWidth
                  margin="normal"
                />
              )}
              renderTags={(selected, getTagProps) =>
                selected.map((option, index) => (
                  <Chip
                    label={option}
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Отмена</Button>
            <Button type="submit" variant="contained">
              {editingUser ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
