import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box, Grid, Card, CardContent, Typography, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  CircularProgress, Alert, Divider, Button, Tooltip,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
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

interface SmtpStatus { configured: boolean; host: string; from_email: string; }

const PlatformDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [smtpMsg, setSmtpMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const { data: smtpStatus } = useQuery<SmtpStatus>(
    ['smtpStatus'],
    async () => { const r = await api.get('/platform/smtp-status'); return r.data; }
  );

  const smtpTest = useMutation(
    async () => { const r = await api.post('/platform/smtp-test'); return r.data; },
    {
      onSuccess: (d: any) => setSmtpMsg({ text: d.message, ok: d.success }),
      onError: () => setSmtpMsg({ text: 'Ошибка при отправке', ok: false }),
    }
  );

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

      {/* SMTP Status */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <EmailIcon color="primary" />
            <Typography fontWeight={600}>SMTP</Typography>
            {smtpStatus?.configured ? (
              <Chip icon={<CheckCircleIcon />} label="Настроен" size="small" color="success" variant="outlined" />
            ) : (
              <Chip icon={<CancelIcon />} label="Не настроен" size="small" color="error" variant="outlined" />
            )}
            {smtpStatus?.host && <Typography variant="body2" color="text.secondary" fontFamily="monospace">{smtpStatus.host}</Typography>}
            {smtpStatus?.from_email && <Typography variant="body2" color="text.secondary">→ {smtpStatus.from_email}</Typography>}
            <Box flex={1} />
            <Button
              variant="outlined" size="small" startIcon={<SendIcon />}
              onClick={() => { setSmtpMsg(null); smtpTest.mutate(); }}
              disabled={smtpTest.isLoading || !smtpStatus?.configured}
            >
              Тест
            </Button>
          </Box>
          {smtpMsg && <Alert severity={smtpMsg.ok ? 'success' : 'error'} onClose={() => setSmtpMsg(null)}>{smtpMsg.text}</Alert>}
        </CardContent>
      </Card>

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
