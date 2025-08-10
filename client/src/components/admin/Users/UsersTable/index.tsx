import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Tooltip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Stack,
  Divider,
  Avatar
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Sync as SyncIcon,
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useUsersTable } from './hooks/useUsersTable';
import { UserRow } from './components/UserRow';
import { User } from '../../../../types/user';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface UsersTableProps {
  onAddUser: () => void;
  onEditUser: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onSyncBitrix: () => void;
}

// Мобильная карточка пользователя
const UserCard: React.FC<{ 
  user: User, 
  onEdit: () => void, 
  onDelete: () => void 
}> = ({ user, onEdit, onDelete }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      {/* Заголовок карточки */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
          <PersonIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div">
            {user.firstName} {user.lastName}
          </Typography>
          <Chip
            label={user.role === 'admin' ? 'Администратор' : 'Пользователь'}
            color={user.role === 'admin' ? 'primary' : 'default'}
            size="small"
          />
        </Box>
        <Chip
          label={user.status === 'active' ? 'Активен' : 'Неактивен'}
          color={user.status === 'active' ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
      </Box>

      {/* Основная информация */}
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon fontSize="small" color="action" />
          <Typography variant="body2">{user.email}</Typography>
        </Box>
        
        {user.phone && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon fontSize="small" color="action" />
            <Typography variant="body2">{user.phone}</Typography>
          </Box>
        )}
        
        {user.bitrix_id && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon fontSize="small" color="action" />
            <Typography variant="body2">Битрикс ID: {user.bitrix_id}</Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon fontSize="small" color="action" />
          <Typography variant="body2">
            Создан: {format(new Date(user.createdAt), 'dd.MM.yyyy', { locale: ru })}
          </Typography>
        </Box>
      </Stack>

      {/* Действия */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        gap: 1,
        pt: 1,
        borderTop: '1px solid',
        borderColor: 'divider'
      }}>
        <IconButton
          onClick={onEdit}
          color="primary"
          size="small"
        >
          <EditIcon />
        </IconButton>
        <IconButton
          onClick={onDelete}
          color="error"
          size="small"
        >
          <DeleteIcon />
        </IconButton>
      </Box>
    </CardContent>
  </Card>
);

export const UsersTable: React.FC<UsersTableProps> = ({
  onAddUser,
  onEditUser,
  onDeleteUser,
  onSyncBitrix
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const {
    users,
    loading,
    error,
    pagination,
    filters,
    handleSearchChange,
    handleRoleFilterChange,
    handleStatusFilterChange,
    handlePageChange,
    refreshUsers
  } = useUsersTable();

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          Ошибка загрузки пользователей: {error}
        </Typography>
        <Button onClick={refreshUsers} sx={{ mt: 2 }}>
          Попробовать снова
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Заголовок и кнопки действий */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 3,
        gap: { xs: 2, sm: 0 }
      }}>
        <Typography variant={isMobile ? "h5" : "h4"} component="h1">
          Управление пользователями
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title="Синхронизировать с Битрикс24">
            <IconButton 
              onClick={onSyncBitrix}
              color="primary"
              disabled={loading}
            >
              <SyncIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={onAddUser}
            disabled={loading}
            size={isMobile ? "small" : "medium"}
          >
            {isMobile ? 'Добавить' : 'Добавить пользователя'}
          </Button>
        </Box>
      </Box>

      {/* Фильтры */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2} 
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <TextField
            placeholder="Поиск по имени или email..."
            variant="outlined"
            size="small"
            sx={{ flex: { xs: 'none', sm: 1 }, minWidth: { sm: 300 } }}
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 } }}>
            <InputLabel>Роль</InputLabel>
            <Select
              value={filters.role}
              label="Роль"
              onChange={(e) => handleRoleFilterChange(e.target.value)}
            >
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="admin">Администратор</MenuItem>
              <MenuItem value="user">Пользователь</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 } }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={filters.status}
              label="Статус"
              onChange={(e) => handleStatusFilterChange(e.target.value)}
            >
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="active">Активный</MenuItem>
              <MenuItem value="inactive">Неактивный</MenuItem>
            </Select>
          </FormControl>

          <Button 
            variant="outlined" 
            size="small"
            onClick={refreshUsers}
            disabled={loading}
            sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
          >
            Обновить
          </Button>
        </Stack>
      </Paper>

      {/* Содержимое */}
      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '200px' 
        }}>
          <Typography>Загрузка...</Typography>
        </Box>
      ) : users.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Пользователи не найдены
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Попробуйте изменить фильтры поиска
          </Typography>
          <Button variant="contained" onClick={onAddUser}>
            Добавить первого пользователя
          </Button>
        </Paper>
      ) : (
        <>
          {/* Отображение пользователей */}
          {isMobile ? (
            // Мобильное отображение - карточки
            <Box>
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onEdit={() => onEditUser(user.id)}
                  onDelete={() => onDeleteUser(user.id)}
                />
              ))}
            </Box>
          ) : (
            // Десктопное отображение - таблица
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Имя</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Роль</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Битрикс ID</TableCell>
                    <TableCell>Телефон</TableCell>
                    <TableCell>Дата создания</TableCell>
                    <TableCell align="center" width="120">Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onEdit={() => onEditUser(user.id)}
                      onDelete={() => onDeleteUser(user.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Пагинация */}
          {pagination.pages > 1 && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              mt: 2 
            }}>
              <Pagination
                count={pagination.pages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
                disabled={loading}
                size={isMobile ? "small" : "medium"}
              />
            </Box>
          )}

          {/* Информация о результатах */}
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Показано {users.length} из {pagination.total} пользователей
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}; 