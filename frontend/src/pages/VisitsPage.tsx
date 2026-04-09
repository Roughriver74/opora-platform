import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Fab,
  Avatar,
  Card,
  CardActionArea,
  useTheme,
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
  visitStatusColors,
} from '../services/visitService';

export const VisitsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
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

  const getStatusColor = (status?: VisitStatus) => {
    if (!status) return 'default';
    const c = visitStatusColors[status] || 'default';
    return c;
  };

  const getStatusDisplayName = (status?: VisitStatus) => {
    if (!status) return '';
    return visitStatusDisplayNames[status] || status;
  };

  return (
    <Box sx={{ position: 'relative', minHeight: '100%', pb: 4 }}>
      {/* Mobile Top Header Area */}
      <Box sx={{ px: 2, pt: 1, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h1">
          Визиты
        </Typography>
        <IconButton onClick={() => refetch()} disabled={isFetching} sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
          <RefreshIcon color={isFetching ? 'disabled' : 'primary'} />
        </IconButton>
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
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              py: 0.5,
            },
            '& .MuiTabs-indicator': {
              display: 'none',
            },
            '& .Mui-selected': {
              bgcolor: theme.palette.mode === 'light' ? '#FFFFFF' : '#3A3A3C',
              color: 'text.primary',
              boxShadow: theme.palette.mode === 'light' ? '0 2px 4px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.4)',
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
          filteredVisits.map((visit) => {
            const status = getVisitStatus(visit);
            return (
              <Card key={visit.id} sx={{ mb: 2 }}>
                <CardActionArea 
                  onClick={() => navigate(`/visits/${visit.id}`)}
                  sx={{ p: 2, display: 'flex', alignItems: 'flex-start' }}
                >
                  <Avatar sx={{ bgcolor: 'primary.light', mr: 2, mt: 0.5 }}>
                    <EventIcon />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ fontWeight: 700, mb: 0.5, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {visit.company?.name || `Клиника №${visit.company_id}` || 'Неизвестная клиника'}
                    </Typography>
                    
                    <Typography variant="body2" color="primary" sx={{ mb: 0.5, fontWeight: 500 }}>
                      {visit.dynamic_fields?.['ufcrm18type'] || visit.visit_type || 'Визит'}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {new Date(visit.date).toLocaleString('ru-RU', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </Typography>

                    <Chip 
                      label={getStatusDisplayName(status)} 
                      color={getStatusColor(status) as any} 
                      size="small"
                      sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                    />
                  </Box>
                  <Box sx={{ alignSelf: 'center', ml: 1, color: 'text.secondary' }}>
                    <ChevronRight />
                  </Box>
                </CardActionArea>
              </Card>
            );
          })
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

      {/* Primary Floating Action Button inside standard Mobile container constraint */}
      <Fab 
        color="primary" 
        onClick={() => navigate('/companies')} // Usually add visit originates from company or search
        sx={{ 
          position: 'fixed', 
          bottom: 84, // Above bottom nav (64 + 20)
          right: 'calc(50% - 280px)', // Centered container max-width 600px -> half is 300px
          // for mobile screens it aligns to right edge
          '@media (max-width: 600px)': {
            right: 20,
          }
        }}
      >
        <AddIcon fontSize="large" />
      </Fab>
    </Box>
  );
};
