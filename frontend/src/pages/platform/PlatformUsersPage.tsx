import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, CircularProgress, TextField,
  MenuItem, Select, FormControl, InputLabel, Grid, IconButton,
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import BlockIcon from '@mui/icons-material/Block';
import LockResetIcon from '@mui/icons-material/LockReset';
import { api } from '../../services/api';

interface PlatformUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  organization_id: number | null;
  organization_name: string | null;
  created_at: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  org_admin: 'Администратор',
  user: 'Пользователь',
};

const PlatformUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page] = useState(1);

  // Reset password dialog
  const [resetUser, setResetUser] = useState<PlatformUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { data: orgs = [] } = useQuery<any[]>(
    ['platformOrgsAll'],
    async () => { const r = await api.get('/platform/organizations?page_size=200'); return r.data; }
  );

  const params = new URLSearchParams({ page: String(page), page_size: '100' });
  if (orgFilter) params.set('organization_id', orgFilter);
  if (roleFilter) params.set('role', roleFilter);
  if (search) params.set('search', search);

  const queryKey = ['platformUsers', orgFilter, roleFilter, search, page];

  const { data: users = [], isLoading } = useQuery<PlatformUser[]>(
    queryKey,
    async () => { const r = await api.get(`/platform/users?${params}`); return r.data; },
    { keepPreviousData: true }
  );

  const toggleActive = useMutation(
    async ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      api.put(`/platform/users/${userId}/toggle`, { is_active: isActive }),
    { onSuccess: () => qc.invalidateQueries(queryKey) }
  );

  const resetPassword = useMutation(
    async ({ userId, password }: { userId: number; password: string }) =>
      api.put(`/platform/users/${userId}/reset-password`, { new_password: password }),
    {
      onSuccess: () => {
        setResetUser(null);
        setNewPassword('');
      },
    }
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={3}>Пользователи платформы</Typography>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Поиск по email / имени"
            size="small"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl size="small" fullWidth>
            <InputLabel>Организация</InputLabel>
            <Select value={orgFilter} label="Организация" onChange={(e) => setOrgFilter(e.target.value)}>
              <MenuItem value="">Все</MenuItem>
              {orgs.map((o: any) => <MenuItem key={o.id} value={String(o.id)}>{o.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl size="small" fullWidth>
            <InputLabel>Роль</InputLabel>
            <Select value={roleFilter} label="Роль" onChange={(e) => setRoleFilter(e.target.value)}>
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="org_admin">Администратор</MenuItem>
              <MenuItem value="user">Пользователь</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {isLoading ? <CircularProgress /> : (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Имя</TableCell>
                <TableCell>Роль</TableCell>
                <TableCell>Организация</TableCell>
                <TableCell align="center">Активен</TableCell>
                <TableCell>Регистрация</TableCell>
                <TableCell align="center">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
                  <TableCell>
                    <Chip label={ROLE_LABELS[u.role] ?? u.role} size="small" color={u.role === 'org_admin' ? 'primary' : 'default'} />
                  </TableCell>
                  <TableCell>
                    {u.organization_name ? (
                      <Typography
                        variant="body2" color="primary"
                        sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => navigate(`/platform/organizations/${u.organization_id}`)}
                      >
                        {u.organization_name}
                      </Typography>
                    ) : '—'}
                  </TableCell>
                  <TableCell align="center">
                    {u.is_active
                      ? <CheckCircleIcon color="success" fontSize="small" />
                      : <CancelIcon color="error" fontSize="small" />}
                  </TableCell>
                  <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={u.is_active ? 'Деактивировать' : 'Активировать'}>
                      <IconButton
                        size="small"
                        color={u.is_active ? 'error' : 'success'}
                        onClick={() => toggleActive.mutate({ userId: u.id, isActive: !u.is_active })}
                      >
                        {u.is_active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Сбросить пароль">
                      <IconButton size="small" onClick={() => { setResetUser(u); setNewPassword(''); }}>
                        <LockResetIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" py={3}>Пользователи не найдены</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!resetUser} onClose={() => setResetUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Сброс пароля</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Пользователь: {resetUser?.email}
          </Typography>
          <TextField
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            size="small"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetUser(null)}>Отмена</Button>
          <Button
            variant="contained"
            disabled={!newPassword || newPassword.length < 6 || resetPassword.isLoading}
            onClick={() => resetUser && resetPassword.mutate({ userId: resetUser.id, password: newPassword })}
          >
            Сбросить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlatformUsersPage;
