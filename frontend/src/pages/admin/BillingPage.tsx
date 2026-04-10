import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Slider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Paper,
  LinearProgress,
  Divider,
  TextField,
} from '@mui/material';
import {
  CreditCard,
  Receipt,
  TrendingUp,
  CheckCircle,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBillingPlan,
  getPayments,
  requestUpgrade,
  checkPaymentStatus,
  BillingPlan,
  Payment,
  UpgradeResponse,
} from '../../services/billingService';
import PageHeader from '../../components/PageHeader';

// --- Helpers ---

const PRICE_PER_USER = 990;

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusLabel = (status: Payment['status']): string => {
  switch (status) {
    case 'paid':
      return 'Оплачен';
    case 'pending':
      return 'Ожидает';
    case 'failed':
      return 'Ошибка';
    case 'cancelled':
      return 'Отменён';
    default:
      return status;
  }
};

const getStatusSx = (status: Payment['status']) => {
  switch (status) {
    case 'paid':
      return { bgcolor: 'success.main', color: '#fff' };
    case 'pending':
      return { bgcolor: 'warning.main', color: '#fff' };
    case 'failed':
      return { bgcolor: 'error.main', color: '#fff' };
    case 'cancelled':
      return { bgcolor: 'text.secondary', color: '#fff' };
    default:
      return {};
  }
};

const getMethodLabel = (method: Payment['method']): string => {
  switch (method) {
    case 'yukassa':
      return 'Онлайн';
    case 'invoice':
      return 'Счёт';
    default:
      return method;
  }
};

// --- Component ---

const BillingPage: React.FC = () => {
  const [usersCount, setUsersCount] = useState<number>(1);
  const [upgradeResult, setUpgradeResult] = useState<UpgradeResponse | null>(null);

  // Fetch billing plan
  const {
    data: billing,
    isLoading: billingLoading,
    error: billingError,
  } = useQuery<BillingPlan>(['billing-plan'], getBillingPlan);

  // Fetch payment history
  const {
    data: payments,
    isLoading: paymentsLoading,
    error: paymentsError,
  } = useQuery<Payment[]>(['billing-payments'], getPayments);

  // Upgrade mutation
  const upgradeMutation = useMutation(requestUpgrade, {
    onSuccess: (data) => {
      setUpgradeResult(data);
      if (data.payment_url) {
        window.open(data.payment_url, '_blank');
      }
    },
  });

  const handleUpgrade = (method: 'yukassa' | 'invoice') => {
    setUpgradeResult(null);
    upgradeMutation.mutate({
      users_count: usersCount,
      payment_method: method,
    });
  };

  const isFree = billing?.plan === 'FREE';

  // Usage progress calculations
  const usersPercent = billing
    ? Math.min((billing.usage.users_count / billing.plan_limits.max_users) * 100, 100)
    : 0;
  const visitsPercent = billing
    ? Math.min(
        (billing.usage.visits_this_month / billing.plan_limits.max_visits_per_month) * 100,
        100
      )
    : 0;

  if (billingLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (billingError) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
        <Alert severity="error">
          Не удалось загрузить информацию о тарифе. Попробуйте обновить страницу.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, mt: 2, maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title="Тарифы и оплата"
        subtitle="Управление подпиской и история платежей"
      />

      {/* ======================== CURRENT PLAN CARD ======================== */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" fontWeight={700}>
                Текущий тариф
              </Typography>
              <Chip
                label={billing?.plan || 'FREE'}
                color={isFree ? 'default' : 'primary'}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  letterSpacing: 0.5,
                  ...(isFree
                    ? {}
                    : {
                        bgcolor: 'primary.main',
                        color: '#fff',
                      }),
                }}
              />
            </Box>
            {!isFree && (
              <CheckCircle sx={{ color: 'success.main', fontSize: 28 }} />
            )}
          </Box>

          {/* Usage stats */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Users usage */}
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 0.5,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Пользователи
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {billing?.usage.users_count ?? 0} / {billing?.plan_limits.max_users ?? 0}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={usersPercent}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    bgcolor: usersPercent >= 90 ? 'warning.main' : 'primary.main',
                  },
                }}
              />
            </Box>

            {/* Visits usage */}
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 0.5,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Визиты в этом месяце
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {billing?.usage.visits_this_month ?? 0} /{' '}
                  {billing?.plan_limits.max_visits_per_month ?? 0}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={visitsPercent}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    bgcolor: visitsPercent >= 90 ? 'warning.main' : 'primary.main',
                  },
                }}
              />
            </Box>
          </Box>

          {/* Billing details */}
          {(billing?.billing_email || billing?.billing_inn) && (
            <>
              <Divider sx={{ my: 2.5 }} />
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {billing.billing_email && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Email для счетов
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {billing.billing_email}
                    </Typography>
                  </Box>
                )}
                {billing.billing_inn && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      ИНН
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {billing.billing_inn}
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* ======================== UPGRADE SECTION ======================== */}
      {isFree && (
        <Card
          elevation={0}
          sx={{
            mb: 3,
            border: '2px solid',
            borderColor: 'primary.main',
            borderRadius: 3,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(10, 132, 255, 0.08)'
                : 'rgba(0, 122, 255, 0.04)',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUp color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Перейти на PRO
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Расширьте возможности: больше пользователей, неограниченные визиты, приоритетная поддержка.
            </Typography>

            {/* Users slider */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Количество пользователей
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Slider
                  value={usersCount}
                  onChange={(_e, val) => setUsersCount(val as number)}
                  min={1}
                  max={50}
                  step={1}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 10, label: '10' },
                    { value: 25, label: '25' },
                    { value: 50, label: '50' },
                  ]}
                  sx={{ flex: 1 }}
                />
                <TextField
                  value={usersCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= 50) {
                      setUsersCount(val);
                    }
                  }}
                  type="number"
                  inputProps={{ min: 1, max: 50 }}
                  size="small"
                  sx={{ width: 80 }}
                />
              </Box>
            </Box>

            {/* Calculated price */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1,
                mb: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
              }}
            >
              <Typography variant="h4" fontWeight={800} color="primary.main">
                {formatCurrency(usersCount * PRICE_PER_USER)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                / мес
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                ({usersCount} x {formatCurrency(PRICE_PER_USER)})
              </Typography>
            </Box>

            {/* Payment buttons */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<CreditCard />}
                onClick={() => handleUpgrade('yukassa')}
                disabled={upgradeMutation.isLoading}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  bgcolor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                Оплатить онлайн
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<Receipt />}
                onClick={() => handleUpgrade('invoice')}
                disabled={upgradeMutation.isLoading}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                }}
              >
                Получить счёт
              </Button>
            </Box>

            {/* Loading state */}
            {upgradeMutation.isLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Обработка запроса...
                </Typography>
              </Box>
            )}

            {/* Success message */}
            {upgradeResult && (
              <Alert
                severity="success"
                sx={{ mt: 2, borderRadius: 2 }}
                icon={<CheckCircle />}
              >
                <Typography variant="body2" fontWeight={600}>
                  {upgradeResult.message}
                </Typography>
                {upgradeResult.invoice_number && (
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    Номер счёта: {upgradeResult.invoice_number}
                  </Typography>
                )}
                {upgradeResult.amount && (
                  <Typography variant="caption" display="block">
                    Сумма: {formatCurrency(upgradeResult.amount)}
                  </Typography>
                )}
                {upgradeResult.payment_url && (
                  <Typography variant="caption" display="block">
                    Ссылка на оплату откроется автоматически. Если нет —{' '}
                    <a
                      href={upgradeResult.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      нажмите здесь
                    </a>
                    .
                  </Typography>
                )}
              </Alert>
            )}

            {/* Error message */}
            {upgradeMutation.isError && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                Не удалось обработать запрос. Попробуйте ещё раз.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* ======================== PAYMENT HISTORY ======================== */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            История платежей
          </Typography>

          {paymentsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : paymentsError ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              Не удалось загрузить историю платежей.
            </Alert>
          ) : !payments || payments.length === 0 ? (
            <Box
              sx={{
                py: 4,
                textAlign: 'center',
              }}
            >
              <Receipt sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Платежей пока нет
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Дата</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Сумма</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Метод</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Описание</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.date)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(payment.status)}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.75rem', ...getStatusSx(payment.status) }}
                        />
                      </TableCell>
                      <TableCell>{getMethodLabel(payment.method)}</TableCell>
                      <TableCell>{payment.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default BillingPage;
