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
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
  role?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
  bitrix_user_id: number;
  regions: string[];
}

interface UserForm {
  email: string;
  password?: string;
  is_active?: boolean;
  role?: string;
  first_name?: string;
  last_name?: string;
  bitrix_user_id?: number;
  regions?: string[];
}

const getRoleLabel = (user: User): string => {
  if (user.role) {
    switch (user.role) {
      case 'platform_admin':
        return 'Админ платформы';
      case 'org_admin':
        return 'Администратор';
      case 'user':
        return 'Пользователь';
      default:
        return user.role;
    }
  }
  return user.is_admin ? 'Администратор' : 'Пользователь';
};

const getRoleColor = (user: User): 'error' | 'warning' | 'info' | 'default' => {
  if (user.role) {
    switch (user.role) {
      case 'platform_admin':
        return 'error';
      case 'org_admin':
        return 'warning';
      case 'user':
        return 'info';
      default:
        return 'default';
    }
  }
  return user.is_admin ? 'warning' : 'info';
};

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserForm>({
    email: '',
    password: '',
    is_active: true,
    role: 'user',
    first_name: '',
    last_name: '',
    bitrix_user_id: undefined,
    regions: [],
  });

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
      return response.data.regions || [];
    },
    {
      onError: (error: any) => {
        enqueueSnackbar('Ошибка при загрузке регионов: ' + (error.response?.data?.detail || 'Неизвестная ошибка'), { variant: 'error' });
      },
    }
  );

  const createUserMutation = useMutation(
    async (userData: UserForm) => {
      // Convert role to is_admin for backward compatibility
      const payload = {
        ...userData,
        is_admin: userData.role === 'org_admin' || userData.role === 'platform_admin',
      };
      await api.post('/users', payload);
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
      const payload = {
        ...data,
        is_admin: data.role === 'org_admin' || data.role === 'platform_admin',
      };
      await api.put(`/users/${id}`, payload);
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

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(true);
      setEditingUserId(user.id);
      // Determine role from user data
      let role = 'user';
      if (user.role) {
        role = user.role;
      } else if (user.is_admin) {
        role = 'org_admin';
      }
      setFormData({
        email: user.email,
        password: '',
        is_active: user.is_active,
        role: role,
        first_name: (user as any).first_name || '',
        last_name: (user as any).last_name || '',
        bitrix_user_id: user.bitrix_user_id,
        regions: user.regions || [],
      });
    } else {
      setEditingUser(false);
      setEditingUserId(null);
      setFormData({
        email: '',
        password: '',
        is_active: true,
        role: 'user',
        first_name: '',
        last_name: '',
        bitrix_user_id: undefined,
        regions: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(false);
    setEditingUserId(null);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email) {
      setError('Пожалуйста, заполните email');
      return;
    }

    if (!editingUser && !formData.password) {
      setError('Пожалуйста, укажите пароль');
      return;
    }

    if (editingUser && editingUserId) {
      const dataToSend = formData.password
        ? { ...formData }
        : {
            email: formData.email,
            is_active: formData.is_active,
            role: formData.role,
            first_name: formData.first_name,
            last_name: formData.last_name,
            bitrix_user_id: formData.bitrix_user_id,
            regions: formData.regions,
          };
      updateUserMutation.mutate({ ...dataToSend, id: editingUserId });
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
    <Box sx={{ mt: { xs: 2, md: 4 }, p: { xs: 2, md: 3 } }}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => handleOpenDialog()}
        sx={{ mb: 3 }}
        fullWidth={isMobile}
      >
        Создать пользователя
      </Button>

      <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
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
        ) : isMobile ? (
          /* Mobile: Card-based layout */
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {users?.map((user) => (
              <Card key={user.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                        {[user.first_name, user.last_name].filter(Boolean).join(' ') || '-'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {user.email}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', ml: 1 }}>
                      <IconButton
                        onClick={() => handleOpenDialog(user)}
                        color="primary"
                        size="small"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteUser(user.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={getRoleLabel(user)}
                      color={getRoleColor(user)}
                      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                    />
                    <Chip
                      size="small"
                      label={user.is_active ? 'Активен' : 'Неактивен'}
                      color={user.is_active ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  </Box>
                  {user.regions && user.regions.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {user.regions.map((region) => (
                        <Chip key={region} label={region} size="small" variant="outlined" />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
            {(!users || users.length === 0) && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                Пользователи не найдены
              </Typography>
            )}
          </Box>
        ) : (
          /* Desktop: Table layout */
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Имя</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Роль</TableCell>
                  <TableCell>Активен</TableCell>
                  <TableCell>Регионы</TableCell>
                  <TableCell>Дата создания</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {[user.first_name, user.last_name].filter(Boolean).join(' ') || '-'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={getRoleLabel(user)}
                        color={getRoleColor(user)}
                        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell>{user.is_active ? 'Да' : 'Нет'}</TableCell>
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          {editingUser ? 'Редактирование пользователя' : 'Создание пользователя'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

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

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Имя"
                value={formData.first_name || ''}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Фамилия"
                value={formData.last_name || ''}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                margin="normal"
              />
            </Box>

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
              <InputLabel>Роль</InputLabel>
              <Select
                value={formData.role || 'user'}
                label="Роль"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="user">Пользователь</MenuItem>
                <MenuItem value="org_admin">Администратор</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Активен</InputLabel>
              <Select
                value={formData.is_active ? 'true' : 'false'}
                label="Активен"
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
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
