import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Business,
  CheckCircle,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

// Статусы с русскими названиями
const STATUS_LABELS: Record<string, string> = {
  completed: 'Состоялся',
  planned: 'Запланирован',
  cancelled: 'Отменён',
  in_progress: 'В работе',
  failed: 'Провалился',
};

// Цвета для статусов — используем палитру дизайн-системы OPORA
const STATUS_COLORS: Record<string, string> = {
  completed: '#059669',   // primary.main — emerald
  planned: '#2563EB',     // info.main — blue
  cancelled: '#EF4444',   // error.main — red
  in_progress: '#F59E0B', // warning.main — amber
  failed: '#78716C',      // stone-500
};

// Тарифные планы с русскими названиями
const PLAN_LABELS: Record<string, string> = {
  free: 'Бесплатный',
  basic: 'Базовый',
  pro: 'Профессиональный',
  enterprise: 'Корпоративный',
};

// ---- KPI Card ---------------------------------------------------------------

interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  growth?: number;
  icon: React.ReactNode;
  color: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  growth,
  icon,
  color,
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: `${color}18`,
            borderRadius: 2,
            p: 1,
            display: 'flex',
            color,
          }}
        >
          {icon}
        </Box>
      </Box>

      {growth !== undefined && (
        <Box display="flex" alignItems="center" mt={1} gap={0.5}>
          {growth >= 0 ? (
            <TrendingUp fontSize="small" color="success" />
          ) : (
            <TrendingDown fontSize="small" color="error" />
          )}
          <Typography
            variant="caption"
            color={growth >= 0 ? 'success.main' : 'error.main'}
            fontWeight={600}
          >
            {growth >= 0 ? '+' : ''}
            {growth}% к прошлому месяцу
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

// ---- Progress bar for plan limits -------------------------------------------

interface PlanLimitBarProps {
  label: string;
  current: number;
  max: number;
  color: string;
}

const PlanLimitBar: React.FC<PlanLimitBarProps> = ({ label, current, max, color }) => {
  const pct = Math.min((current / max) * 100, 100);
  const overloaded = pct > 90;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" fontWeight={600}>
          {current} / {max}
        </Typography>
      </Box>
      <Box
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: 'grey.200',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${pct}%`,
            bgcolor: overloaded ? 'error.main' : color,
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }}
        />
      </Box>
    </Box>
  );
};

// ---- Main Page --------------------------------------------------------------

const AnalyticsDashboardPage: React.FC = () => {
  const theme = useTheme();
  const [period, setPeriod] = useState<number>(30);

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => analyticsService.getSummary(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: visitsByDay, isLoading: chartLoading } = useQuery({
    queryKey: ['analytics', 'visits-by-day', period],
    queryFn: () => analyticsService.getVisitsByDay(period),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: topUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['analytics', 'top-users', period],
    queryFn: () => analyticsService.getTopUsers(period),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // --- Loading state ---
  if (summaryLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  // --- Error state ---
  if (summaryError) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Не удалось загрузить аналитику. Убедитесь, что бэкенд поддерживает
          маршруты <code>/api/analytics/*</code>.
        </Alert>
      </Box>
    );
  }

  // --- Data preparation ---
  const statusData = summary
    ? Object.entries(summary.visits_by_status)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
          name,
          label: STATUS_LABELS[name] || name,
          value,
        }))
    : [];

  const chartData = (visitsByDay || []).map((d) => ({
    ...d,
    displayDate: format(parseISO(d.date), 'd MMM', { locale: ru }),
  }));

  // Tick interval so we show ~6 labels regardless of period length
  const tickInterval =
    chartData.length > 0 ? Math.max(Math.floor(chartData.length / 6) - 1, 0) : 0;

  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;

  return (
    <Box p={3}>
      {/* ---- Page header ---- */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Аналитика
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Статистика работы команды
          </Typography>
        </Box>
        {summary && (
          <Chip
            label={PLAN_LABELS[summary.plan] || summary.plan}
            color={summary.plan === 'free' ? 'default' : 'primary'}
            variant="outlined"
            size="small"
          />
        )}
      </Box>

      {/* ---- KPI cards ---- */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title="Визиты в этом месяце"
            value={summary?.visits_this_month ?? 0}
            growth={summary?.visits_growth_pct}
            icon={<CheckCircle />}
            color={primaryColor}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title="Активных сотрудников"
            value={summary?.active_users_this_month ?? 0}
            subtitle={`из ${summary?.total_users ?? 0} всего`}
            icon={<People />}
            color={secondaryColor}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title="Компании"
            value={summary?.total_companies ?? 0}
            icon={<Business />}
            color="#6366F1"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title="Пользователи"
            value={summary?.total_users ?? 0}
            icon={<People />}
            color={theme.palette.warning.main}
          />
        </Grid>
      </Grid>

      {/* ---- Period toggle ---- */}
      <Box mb={2} display="flex" justifyContent="flex-end">
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, v) => v && setPeriod(v)}
          size="small"
        >
          <ToggleButton value={7}>7 дней</ToggleButton>
          <ToggleButton value={30}>30 дней</ToggleButton>
          <ToggleButton value={90}>90 дней</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ---- Charts row ---- */}
      <Grid container spacing={2} mb={3}>
        {/* Line chart — visits by day */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Визиты по дням
              </Typography>
              {chartLoading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress size={32} />
                </Box>
              ) : chartData.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={280}>
                  <Typography variant="body2" color="text.secondary">
                    Нет данных за выбранный период
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                      interval={tickInterval}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                      allowDecimals={false}
                      width={32}
                    />
                    <Tooltip
                      formatter={(value) => [value, 'Визитов']}
                      labelFormatter={(label) => `Дата: ${label}`}
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={primaryColor}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: primaryColor }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Pie chart — by status */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                По статусам
              </Typography>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={90}
                      dataKey="value"
                      nameKey="label"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={
                            STATUS_COLORS[entry.name] ||
                            `hsl(${index * 60}, 60%, 50%)`
                          }
                        />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value) => (
                        <span style={{ fontSize: 12, color: theme.palette.text.primary }}>
                          {value}
                        </span>
                      )}
                    />
                    <Tooltip
                      formatter={(value, name) => [value, name]}
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  height={280}
                >
                  <Typography variant="body2" color="text.secondary">
                    Нет данных за период
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ---- Bottom row: top users + plan limits ---- */}
      <Grid container spacing={2}>
        {/* Top users table */}
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Топ сотрудников по визитам
              </Typography>
              {usersLoading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 40, color: 'text.secondary', fontSize: 12 }}>
                        #
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>
                        Email
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: 'text.secondary', fontSize: 12 }}
                      >
                        Визитов
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(topUsers || []).map((u, idx) => (
                      <TableRow key={u.user_id} hover>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {idx + 1}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{u.email}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color="primary.main"
                          >
                            {u.visits_count}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!topUsers || topUsers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            Нет данных за выбранный период
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Plan limits */}
        {summary && (
          <Grid item xs={12} lg={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Использование тарифа
                </Typography>
                <Box display="flex" flexDirection="column" gap={2.5}>
                  {summary.plan_limits.max_visits_per_month != null && (
                    <PlanLimitBar
                      label="Визиты в месяц"
                      current={summary.visits_this_month}
                      max={summary.plan_limits.max_visits_per_month}
                      color={primaryColor}
                    />
                  )}
                  {summary.plan_limits.max_users != null && (
                    <PlanLimitBar
                      label="Пользователи"
                      current={summary.total_users}
                      max={summary.plan_limits.max_users}
                      color={secondaryColor}
                    />
                  )}
                  {summary.plan_limits.max_companies != null && (
                    <PlanLimitBar
                      label="Компании"
                      current={summary.total_companies}
                      max={summary.plan_limits.max_companies}
                      color="#6366F1"
                    />
                  )}
                  {/* Если лимитов нет — показываем заглушку */}
                  {summary.plan_limits.max_visits_per_month == null &&
                    summary.plan_limits.max_users == null &&
                    summary.plan_limits.max_companies == null && (
                      <Typography variant="body2" color="text.secondary">
                        Лимиты тарифа не заданы
                      </Typography>
                    )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboardPage;
