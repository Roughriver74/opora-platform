import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  Chip,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  useTheme,
  Card,
  CardContent,
  SelectChangeEvent,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  IconButton,
} from '@mui/material';
import {
  Business,
  People,
  TrendingUp,
  Add,
  Delete,
  Download,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: 'FREE' | 'PRO';
  is_active: boolean;
  users_count: number;
  user_count: number;
  created_at: string;
}

interface PlatformStats {
  total_organizations: number;
  total_users: number;
  total_visits: number;
}

function exportOrgsToCSV(orgs: Organization[]) {
  const headers = ['ID', 'Название', 'Slug', 'Тариф', 'Пользователи', 'Активна', 'Создана'];
  const rows = orgs.map(o => [
    o.id,
    o.name,
    o.slug,
    o.plan,
    o.user_count ?? o.users_count ?? 0,
    o.is_active ? 'Да' : 'Нет',
    o.created_at ? new Date(o.created_at).toLocaleDateString('ru-RU') : '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `organizations_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const PlatformOrganizationsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Create org dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', owner_email: '', owner_password: '', plan: 'free', max_users: 3, max_visits_per_month: 500 });

  // Delete org dialog
  const [deleteOrg, setDeleteOrg] = useState<Organization | null>(null);

  const orgQueryKey = ['platformOrganizations', search];

  // Fetch platform stats
  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>(
    ['platformStats'],
    async () => {
      const response = await api.get('/platform/stats');
      return response.data;
    }
  );

  // Fetch organizations
  const { data: organizations, isLoading: orgsLoading, error: orgsError } = useQuery<Organization[]>(
    orgQueryKey,
    async () => {
      const params = new URLSearchParams({ page_size: '200' });
      if (search) params.set('search', search);
      const response = await api.get(`/platform/organizations?${params}`);
      return response.data;
    }
  );

  // Update organization mutation
  const updateOrgMutation = useMutation(
    async ({ id, data }: { id: number; data: Partial<Organization> }) => {
      const response = await api.put(`/platform/organizations/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(orgQueryKey);
        queryClient.invalidateQueries(['platformStats']);
        setUpdateError(null);
      },
      onError: (err: any) => {
        setUpdateError(err.response?.data?.message || 'Ошибка при обновлении организации');
      },
    }
  );

  const createOrgMutation = useMutation(
    async (data: typeof newOrg) => {
      const response = await api.post('/platform/organizations', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(orgQueryKey);
        queryClient.invalidateQueries(['platformStats']);
        setCreateOpen(false);
        setNewOrg({ name: '', owner_email: '', owner_password: '', plan: 'free', max_users: 3, max_visits_per_month: 500 });
      },
      onError: (err: any) => {
        setUpdateError(err.response?.data?.detail || 'Ошибка при создании организации');
      },
    }
  );

  const deleteOrgMutation = useMutation(
    async (orgId: number) => {
      await api.delete(`/platform/organizations/${orgId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(orgQueryKey);
        queryClient.invalidateQueries(['platformStats']);
        setDeleteOrg(null);
      },
      onError: (err: any) => {
        setUpdateError(err.response?.data?.detail || 'Ошибка при удалении организации');
        setDeleteOrg(null);
      },
    }
  );

  const handleToggleActive = (org: Organization) => {
    updateOrgMutation.mutate({
      id: org.id,
      data: { is_active: !org.is_active },
    });
  };

  const handlePlanChange = (org: Organization, event: SelectChangeEvent<string>) => {
    updateOrgMutation.mutate({
      id: org.id,
      data: { plan: event.target.value as 'FREE' | 'PRO' },
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isLoading = statsLoading || orgsLoading;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Управление платформой
      </Typography>

      {/* Stats cards */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Business sx={{ color: 'primary.main', fontSize: 28 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {stats?.total_organizations ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Организации
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <People sx={{ color: 'secondary.main', fontSize: 28 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {stats?.total_users ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Пользователи
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp sx={{ color: 'success.main', fontSize: 28 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {stats?.total_visits ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Визиты
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {updateError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setUpdateError(null)}>
          {updateError}
        </Alert>
      )}

      {orgsError && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          Ошибка загрузки организаций
        </Alert>
      )}

      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" fontWeight={600}>Организации</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 220 }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download />}
            onClick={() => organizations && exportOrgsToCSV(organizations)}
            disabled={!organizations || organizations.length === 0}
          >
            CSV
          </Button>
          <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
            Создать
          </Button>
        </Box>
      </Box>

      {/* Organizations table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Название</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Slug</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Тариф</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Пользователи</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Активна</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Создана</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {organizations && organizations.length > 0 ? (
              organizations.map((org) => (
                <TableRow key={org.id} hover>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => navigate(`/platform/organizations/${org.id}`)}
                    >
                      {org.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {org.slug}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={org.plan}
                      onChange={(e) => handlePlanChange(org, e)}
                      size="small"
                      variant="standard"
                      sx={{ fontSize: '0.85rem' }}
                      disabled={updateOrgMutation.isLoading}
                    >
                      <MenuItem value="FREE">
                        <Chip label="FREE" size="small" color="default" variant="outlined" />
                      </MenuItem>
                      <MenuItem value="PRO">
                        <Chip label="PRO" size="small" color="primary" />
                      </MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {org.user_count ?? org.users_count ?? 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={org.is_active}
                      onChange={() => handleToggleActive(org)}
                      size="small"
                      color="success"
                      disabled={updateOrgMutation.isLoading}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(org.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Удалить организацию">
                      <IconButton size="small" color="error" onClick={() => setDeleteOrg(org)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Нет организаций
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create org dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать организацию</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Название компании" size="small" fullWidth required
              value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} />
            <TextField label="Email владельца" size="small" fullWidth required type="email"
              value={newOrg.owner_email} onChange={(e) => setNewOrg({ ...newOrg, owner_email: e.target.value })} />
            <TextField label="Пароль владельца" size="small" fullWidth required type="password"
              value={newOrg.owner_password} onChange={(e) => setNewOrg({ ...newOrg, owner_password: e.target.value })} />
            <Select value={newOrg.plan} size="small" onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })}>
              <MenuItem value="free">FREE</MenuItem>
              <MenuItem value="pro">PRO</MenuItem>
              <MenuItem value="enterprise">ENTERPRISE</MenuItem>
            </Select>
            <TextField label="Макс. пользователей" size="small" type="number" fullWidth
              value={newOrg.max_users} onChange={(e) => setNewOrg({ ...newOrg, max_users: parseInt(e.target.value) || 1 })} />
            <TextField label="Макс. визитов в месяц" size="small" type="number" fullWidth
              value={newOrg.max_visits_per_month} onChange={(e) => setNewOrg({ ...newOrg, max_visits_per_month: parseInt(e.target.value) || 100 })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={() => createOrgMutation.mutate(newOrg)}
            disabled={!newOrg.name || !newOrg.owner_email || !newOrg.owner_password || createOrgMutation.isLoading}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete org dialog */}
      <Dialog open={!!deleteOrg} onClose={() => setDeleteOrg(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Удалить организацию?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Организация <strong>{deleteOrg?.name}</strong> и все её данные (пользователи, визиты, настройки) будут удалены безвозвратно.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOrg(null)}>Отмена</Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteOrgMutation.isLoading}
            onClick={() => deleteOrg && deleteOrgMutation.mutate(deleteOrg.id)}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
      </>
    </Box>
  );
};

export default PlatformOrganizationsPage;
