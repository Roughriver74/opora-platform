import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, CircularProgress, TextField,
  MenuItem, Select, FormControl, InputLabel, Grid, Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
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

interface OrgOption {
  id: number;
  name: string;
}

const ROLE_LABELS: Record<string, string> = {
  org_admin: 'Администратор',
  user: 'Пользователь',
};

const PlatformUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page] = useState(1);

  const { data: orgs = [] } = useQuery<OrgOption[]>(
    ['platformOrgsAll'],
    async () => { const r = await api.get('/platform/organizations?page_size=200'); return r.data; }
  );

  const params = new URLSearchParams({ page: String(page), page_size: '100' });
  if (orgFilter) params.set('organization_id', orgFilter);
  if (roleFilter) params.set('role', roleFilter);
  if (search) params.set('search', search);

  const { data: users = [], isLoading } = useQuery<PlatformUser[]>(
    ['platformUsers', orgFilter, roleFilter, search, page],
    async () => { const r = await api.get(`/platform/users?${params}`); return r.data; },
    { keepPreviousData: true }
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
                <TableCell>Дата регистрации</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={ROLE_LABELS[u.role] ?? u.role}
                      size="small"
                      color={u.role === 'org_admin' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {u.organization_name ? (
                      <Typography
                        variant="body2"
                        color="primary"
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
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" py={3}>Пользователи не найдены</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default PlatformUsersPage;
