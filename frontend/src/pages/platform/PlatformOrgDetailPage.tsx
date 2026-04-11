import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Button,
  CircularProgress, Alert, Divider, Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { api } from '../../services/api';

interface OrgDetails {
  id: number;
  name: string;
  slug: string | null;
  plan: string;
  plan_limits: { max_users?: number; max_visits_per_month?: number } | null;
  is_active: boolean;
  owner_id: number | null;
  api_key: string | null;
  bitrix24_webhook_url: string | null;
  created_at: string | null;
  user_count: number;
  visit_count: number;
  users: Array<{
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    is_active: boolean;
    created_at: string | null;
  }>;
}

const ROLE_LABELS: Record<string, string> = { org_admin: 'Администратор', user: 'Пользователь' };

const PlatformOrgDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: org, isLoading, error } = useQuery<OrgDetails>(
    ['platformOrgDetails', id],
    async () => { const r = await api.get(`/platform/organizations/${id}/details`); return r.data; }
  );

  const toggleActive = useMutation(
    async () => api.put(`/platform/organizations/${id}`, { is_active: !org!.is_active }),
    { onSuccess: () => qc.invalidateQueries(['platformOrgDetails', id]) }
  );

  const changePlan = useMutation(
    async (plan: string) => api.put(`/platform/organizations/${id}`, { plan }),
    { onSuccess: () => qc.invalidateQueries(['platformOrgDetails', id]) }
  );

  if (isLoading) return <Box p={3}><CircularProgress /></Box>;
  if (error || !org) return <Box p={3}><Alert severity="error">Организация не найдена</Alert></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/platform/organizations')} sx={{ mb: 2 }}>
        Назад
      </Button>

      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>{org.name}</Typography>
        <Chip label={org.plan.toUpperCase()} color={org.plan === 'free' ? 'default' : 'primary'} size="small" />
        <Chip
          label={org.is_active ? 'Активна' : 'Неактивна'}
          color={org.is_active ? 'success' : 'error'}
          size="small"
        />
      </Stack>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography fontWeight={600} mb={2}>Информация</Typography>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Slug</Typography>
                  <Typography>{org.slug || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Дата создания</Typography>
                  <Typography>{org.created_at ? new Date(org.created_at).toLocaleDateString('ru-RU') : '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Лимиты тарифа</Typography>
                  <Typography>
                    Пользователей: {org.plan_limits?.max_users ?? '∞'} / Визитов в месяц: {org.plan_limits?.max_visits_per_month ?? '∞'}
                  </Typography>
                </Box>
                {org.api_key && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">API Key</Typography>
                    <Typography fontFamily="monospace">{org.api_key}</Typography>
                  </Box>
                )}
                {org.bitrix24_webhook_url && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Bitrix24 Webhook</Typography>
                    <Typography fontFamily="monospace">{org.bitrix24_webhook_url}</Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography fontWeight={600} mb={2}>Статистика</Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography color="text.secondary">Пользователей</Typography>
                  <Typography fontWeight={600}>{org.user_count}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography color="text.secondary">Визитов всего</Typography>
                  <Typography fontWeight={600}>{org.visit_count}</Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography fontWeight={600} mb={1}>Управление</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  color={org.is_active ? 'error' : 'success'}
                  size="small"
                  onClick={() => toggleActive.mutate()}
                  disabled={toggleActive.isLoading}
                >
                  {org.is_active ? 'Деактивировать' : 'Активировать'}
                </Button>
                {org.plan === 'free' ? (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => changePlan.mutate('pro')}
                    disabled={changePlan.isLoading}
                  >
                    Перевести на PRO
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => changePlan.mutate('free')}
                    disabled={changePlan.isLoading}
                  >
                    Перевести на FREE
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight={600} mb={2}>Пользователи организации</Typography>
      <TableContainer component={Paper} elevation={2}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Имя</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell align="center">Активен</TableCell>
              <TableCell>Дата регистрации</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {org.users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.email}</TableCell>
                <TableCell>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
                <TableCell>
                  <Chip label={ROLE_LABELS[u.role] ?? u.role} size="small" color={u.role === 'org_admin' ? 'primary' : 'default'} />
                </TableCell>
                <TableCell align="center">
                  {u.is_active
                    ? <CheckCircleIcon color="success" fontSize="small" />
                    : <CancelIcon color="error" fontSize="small" />}
                </TableCell>
                <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}</TableCell>
              </TableRow>
            ))}
            {org.users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" py={2}>Нет пользователей</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PlatformOrgDetailPage;
