import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Fab,
  Avatar,
  Card,
  CardActionArea,
  useTheme,
  useMediaQuery,
  Grid,
  Button,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  ChevronRight,
  Refresh as RefreshIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import {
  visitService,
  Visit,
  VisitStatus,
  visitStatusDisplayNames,
} from '../services/visitService';

// Status dot colors matching landing palette
const statusDotColors: Record<string, string> = {
  planned: '#2563EB',     // Blue-600
  in_progress: '#F59E0B', // Amber-500
  completed: '#059669',   // Emerald-600
  failed: '#EF4444',      // Red-500
  cancelled: '#78716C',   // Stone-500
};

export const VisitsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [tabIndex, setTabIndex] = useState(0); // 0 = upcoming, 1 = completed
  const visitFilter = tabIndex === 0 ? 'upcoming' : 'completed';
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);

  const { data: visits, isLoading, error, refetch, isFetching } = useQuery<Visit[]>({
    queryKey: ['visits'],
    queryFn: visitService.getVisits,
  });

  const getVisitStatus = (visit: any): VisitStatus => {
    if (visit.status) return visit.status as VisitStatus;
    return VisitStatus.planned;
  };

  useEffect(() => {
    if (!visits) return;

    let filtered = [];
    if (visitFilter === 'upcoming') {
      filtered = visits.filter(visit => {
        const visitStatus = getVisitStatus(visit);
        return visitStatus === VisitStatus.planned || visitStatus === VisitStatus.in_progress;
      });
      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      filtered = visits.filter(visit => {
        const visitStatus = getVisitStatus(visit);
        return visitStatus === VisitStatus.completed || visitStatus === VisitStatus.failed || visitStatus === VisitStatus.cancelled;
      });
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    setFilteredVisits(filtered);
  }, [visits, visitFilter]);

  const getStatusDisplayName = (status?: VisitStatus) => {
    if (!status) return '';
    return visitStatusDisplayNames[status] || status;
  };

  const getStatusDotColor = (status?: VisitStatus) => {
    if (!status) return '#8E8E93';
    return statusDotColors[status] || '#8E8E93';
  };

  return (
    <Box sx={{ position: 'relative', minHeight: '100%', pb: 12 }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 1, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h1">
          Визиты
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => refetch()} disabled={isFetching} sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
            <RefreshIcon color={isFetching ? 'disabled' : 'primary'} />
          </IconButton>
          {!isMobile && (
            <Button variant="contained" onClick={() => navigate('/companies')}>
              Создать визит
            </Button>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Tabs 
          value={tabIndex} 
          onChange={(e, val) => setTabIndex(val)}
          variant="fullWidth"
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            p: 0.5,
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              py: 1,
            },
            '& .MuiTabs-indicator': {
              display: 'none',
            },
            '& .Mui-selected': {
              bgcolor: theme.palette.background.paper,
              color: 'text.primary',
              boxShadow: theme.palette.mode === 'light'
                ? '0 2px 8px rgba(0,0,0,0.08)'
                : '0 2px 8px rgba(0,0,0,0.4)',
            }
          }}
        >
          <Tab label="Предстоящие" />
          <Tab label="Прошедшие" />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ px: 2 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Ошибка при загрузке визитов. Пожалуйста, попробуйте обновить страницу.
          </Alert>
        ) : filteredVisits.length > 0 ? (
          <Grid container spacing={2}>
            {filteredVisits.map((visit) => {
              const status = getVisitStatus(visit);
              return (
                <Grid item xs={12} md={6} lg={4} key={visit.id}>
                  <Card
                    sx={{
                      borderRadius: '20px',
                      boxShadow: theme.palette.mode === 'light'
                        ? '0 2px 10px rgba(0,0,0,0.04)'
                        : '0 2px 10px rgba(0,0,0,0.3)',
                    }}
                  >
                    <CardActionArea
                      onClick={() => navigate(`/visits/${visit.id}`)}
                      sx={{ p: 2, display: 'flex', alignItems: 'flex-start', borderRadius: '20px' }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.12),
                          color: 'primary.main',
                          mr: 2,
                          mt: 0.5,
                        }}
                      >
                        <EventIcon />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            mb: 0.5,
                            lineHeight: 1.2,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {visit.company?.name || `Компания #${visit.company_id}` || 'Неизвестная компания'}
                        </Typography>

                        <Typography variant="body2" color="primary" sx={{ mb: 0.5, fontWeight: 500 }}>
                          {visit.dynamic_fields?.['ufcrm18type'] || visit.visit_type || 'Визит'}
                        </Typography>

                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          {new Date(visit.date).toLocaleString('ru-RU', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </Typography>

                        {/* iOS-style status pill with color dot */}
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1.5,
                            py: 0.5,
                            borderRadius: '12px',
                            bgcolor: alpha(getStatusDotColor(status), 0.1),
                          }}
                        >
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: getStatusDotColor(status),
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              color: getStatusDotColor(status),
                              lineHeight: 1,
                            }}
                          >
                            {getStatusDisplayName(status)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ alignSelf: 'center', ml: 1, color: 'text.secondary' }}>
                        <ChevronRight />
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Box p={4} textAlign="center">
            <Typography variant="body1" color="text.secondary">
              {visitFilter === 'upcoming'
                ? 'Нет предстоящих визитов'
                : 'Нет состоявшихся визитов'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* FAB — mobile only */}
      {isMobile && (
        <Fab
          color="primary"
          onClick={() => navigate('/companies')}
          sx={{
            position: 'fixed',
            bottom: 84,
            right: 20,
          }}
        >
          <AddIcon fontSize="large" />
        </Fab>
      )}
    </Box>
  );
};
