import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, CircularProgress, MenuItem,
  Select, FormControl, InputLabel, Grid,
} from '@mui/material';
import { api } from '../../services/api';

interface PaymentRecord {
  id: number;
  organization_id: number;
  organization_name: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  description: string | null;
  created_at: string | null;
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  paid: 'success',
  pending: 'warning',
  failed: 'error',
  refunded: 'info',
};
const STATUS_LABELS: Record<string, string> = {
  paid: 'Оплачен',
  pending: 'Ожидание',
  failed: 'Ошибка',
  refunded: 'Возврат',
};
const METHOD_LABELS: Record<string, string> = {
  yukassa: 'ЮKassa',
  invoice: 'Счёт',
  manual: 'Вручную',
};

const PlatformPaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');

  const { data: orgs = [] } = useQuery<any[]>(
    ['platformOrgsAll'],
    async () => { const r = await api.get('/platform/organizations?page_size=200'); return r.data; }
  );

  const params = new URLSearchParams({ page: '1', page_size: '100' });
  if (statusFilter) params.set('status', statusFilter);
  if (orgFilter) params.set('organization_id', orgFilter);

  const { data: payments = [], isLoading } = useQuery<PaymentRecord[]>(
    ['platformPayments', statusFilter, orgFilter],
    async () => { const r = await api.get(`/platform/payments?${params}`); return r.data; },
    { keepPreviousData: true }
  );

  const formatAmount = (kopecks: number) => {
    return (kopecks / 100).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={3}>Платежи</Typography>

      <Grid container spacing={2} mb={3}>
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
            <InputLabel>Статус</InputLabel>
            <Select value={statusFilter} label="Статус" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="paid">Оплачен</MenuItem>
              <MenuItem value="pending">Ожидание</MenuItem>
              <MenuItem value="failed">Ошибка</MenuItem>
              <MenuItem value="refunded">Возврат</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {isLoading ? <CircularProgress /> : (
        <TableContainer component={Paper} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Организация</TableCell>
                <TableCell align="right">Сумма</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Способ</TableCell>
                <TableCell>Описание</TableCell>
                <TableCell>Дата</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="primary"
                      sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => navigate(`/platform/organizations/${p.organization_id}`)}
                    >
                      {p.organization_name || `Org #${p.organization_id}`}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={600}>{formatAmount(p.amount)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[p.status] ?? p.status}
                      size="small"
                      color={STATUS_COLORS[p.status] ?? 'default'}
                    />
                  </TableCell>
                  <TableCell>{METHOD_LABELS[p.payment_method ?? ''] ?? p.payment_method ?? '—'}</TableCell>
                  <TableCell>{p.description || '—'}</TableCell>
                  <TableCell>{p.created_at ? new Date(p.created_at).toLocaleDateString('ru-RU') : '—'}</TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" py={3}>Платежей не найдено</Typography>
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

export default PlatformPaymentsPage;
