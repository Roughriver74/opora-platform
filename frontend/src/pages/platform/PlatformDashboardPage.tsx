import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Grid, Card, CardContent, Typography, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  CircularProgress, Alert, Divider, Button,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { api } from '../../services/api';

interface PlatformStats {
  total_organizations: number;
  total_users: number;
  total_visits: number;
  active_organizations: number;
  new_organizations_last_30d: number;
  new_users_last_30d: number;
  paid_organizations: number;
}

interface OrgResponse {
  id: number;
  name: string;
  slug: string | null;
  plan: string;
  user_count: number;
  is_active: boolean;
  created_at: string | null;
}

const PlatformDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>(
    ['platformStats'],
    async () => { const r = await api.get('/platform/stats'); return r.data; }
  );

  const { data: orgsData, isLoading: orgsLoading } = useQuery<OrgResponse[]>(
    ['platformOrgs', 1],
    async () => { const r = await api.get('/platform/organizations?page=1&page_size=10'); return r.data; }
  );

  const kpiCards = stats ? [
    { label: 'Всего организаций', value: stats.total_organizations, sub: `${stats.active_organizations} активных`, icon: <BusinessIcon sx={{ fontSize: 40, color: 'primary.main' }} />, color: 'primary.light' },
    { label: 'Всего пользователей', value: stats.total_users, sub: `+${stats.new_users_last_30d} за 30 дней`, icon: <PeopleIcon sx={{ fontSize: 40, color: 'success.main' }} />, color: 'success.light' },
    { label: 'Всего визитов', value: stats.total_visits, sub: 'за всё время', icon: <EventNoteIcon sx={{ fontSize: 40, color: 'warning.main' }} />, color: 'warning.light' },
    { label: 'Платных тарифов', value: stats.paid_organizations, sub: `+${stats.new_organizations_last_30d} орг. за 30 дней`, icon: <TrendingUpIcon sx={{ fontSize: 40, color: 'secondary.main' }} />, color: 'secondary.light' },
  ] : [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={3}>Обзор платформы</Typography>

      {statsLoading ? (
        <CircularProgress />
      ) : stats ? (
        <Grid container spacing={2} mb={4}>
          {kpiCards.map((card) => (
            <Grid item xs={12} sm={6} md={3} key={card.label}>
              <Card elevation={2}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography color="text.secondary" variant="body2">{card.label}</Typography>
                      <Typography variant="h4" fontWeight={700} mt={0.5}>{card.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{card.sub}</Typography>
                    </Box>
                    {card.icon}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : null}

      <Typography variant="h6" fontWeight={600} mb={2}>Последние организации</Typography>
      {orgsLoading ? <CircularProgress /> : (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Название</TableCell>
                <TableCell>Тариф</TableCell>
                <TableCell align="center">Пользователи</TableCell>
                <TableCell align="center">Статус</TableCell>
                <TableCell>Создана</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(orgsData ?? []).map((org) => (
                <TableRow
                  key={org.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/platform/organizations/${org.id}`)}
                >
                  <TableCell><Typography fontWeight={500}>{org.name}</Typography></TableCell>
                  <TableCell>
                    <Chip label={org.plan.toUpperCase()} size="small" color={org.plan === 'free' ? 'default' : 'primary'} />
                  </TableCell>
                  <TableCell align="center">{org.user_count}</TableCell>
                  <TableCell align="center">
                    <Chip label={org.is_active ? 'Активна' : 'Неактивна'} size="small" color={org.is_active ? 'success' : 'error'} />
                  </TableCell>
                  <TableCell>{org.created_at ? new Date(org.created_at).toLocaleDateString('ru-RU') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Button sx={{ mt: 1 }} onClick={() => navigate('/platform/organizations')}>
        Все организации →
      </Button>
    </Box>
  );
};

export default PlatformDashboardPage;
