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
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Business,
  People,
  TrendingUp,
  Email,
  CheckCircle,
  Cancel,
  Send,
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
  created_at: string;
}

interface PlatformStats {
  total_organizations: number;
  total_users: number;
  total_visits: number;
}

interface SmtpStatus {
  configured: boolean;
  host: string;
  from_email: string;
}

interface SmtpTestResult {
  success: boolean;
  message: string;
}

const PlatformOrganizationsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [smtpTestMessage, setSmtpTestMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  // Fetch SMTP status
  const { data: smtpStatus, isLoading: smtpLoading } = useQuery<SmtpStatus>(
    ['smtpStatus'],
    async () => {
      const response = await api.get('/platform/smtp-status');
      return response.data;
    }
  );

  // SMTP test mutation
  const smtpTestMutation = useMutation(
    async () => {
      const response = await api.post('/platform/smtp-test');
      return response.data as SmtpTestResult;
    },
    {
      onSuccess: (data) => {
        setSmtpTestMessage({
          text: data.message,
          severity: data.success ? 'success' : 'error',
        });
      },
      onError: (err: any) => {
        setSmtpTestMessage({
          text: err.response?.data?.message || 'Ошибка при отправке тестового письма',
          severity: 'error',
        });
      },
    }
  );

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
    ['platformOrganizations'],
    async () => {
      const response = await api.get('/platform/organizations');
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
        queryClient.invalidateQueries(['platformOrganizations']);
        queryClient.invalidateQueries(['platformStats']);
        setUpdateError(null);
      },
      onError: (err: any) => {
        setUpdateError(err.response?.data?.message || 'Ошибка при обновлении организации');
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

      {/* SMTP Settings Card */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Email sx={{ color: 'primary.main', fontSize: 22 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Настройки SMTP
            </Typography>
          </Box>

          {smtpLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Статус:
                  </Typography>
                  {smtpStatus?.configured ? (
                    <Chip
                      icon={<CheckCircle sx={{ fontSize: 16 }} />}
                      label="Настроен"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  ) : (
                    <Chip
                      icon={<Cancel sx={{ fontSize: 16 }} />}
                      label="Не настроен"
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Box>

                {smtpStatus?.host && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Хост:
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {smtpStatus.host}
                    </Typography>
                  </Box>
                )}

                {smtpStatus?.from_email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      От:
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {smtpStatus.from_email}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Настройте SMTP переменные в .env файле на сервере
                </Typography>
                <Tooltip title={smtpStatus?.configured ? 'Отправить тестовое письмо на ваш email' : 'Сначала настройте SMTP'}>
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={smtpTestMutation.isLoading ? <CircularProgress size={16} /> : <Send />}
                      onClick={() => {
                        setSmtpTestMessage(null);
                        smtpTestMutation.mutate();
                      }}
                      disabled={smtpTestMutation.isLoading}
                      sx={{ textTransform: 'none' }}
                    >
                      Тест email
                    </Button>
                  </span>
                </Tooltip>
              </Box>

              {smtpTestMessage && (
                <Alert
                  severity={smtpTestMessage.severity}
                  sx={{ mt: 1.5, borderRadius: 1.5 }}
                  onClose={() => setSmtpTestMessage(null)}
                >
                  {smtpTestMessage.text}
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
                      {org.users_count}
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
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Нет организаций
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </>
    </Box>
  );
};

export default PlatformOrganizationsPage;
