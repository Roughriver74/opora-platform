import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  useTheme,
  Badge,
  Modal,
  IconButton,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Avatar
} from '@mui/material';
import { 
  Close as CloseIcon, 
  NavigateBefore, 
  NavigateNext,
  CheckCircle,
  PendingActions,
  Timeline as TimelineIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { visitService, Visit, VisitStatus } from '../services/visitService';

// Определяем интерфейс для дня с визитами
interface CalendarDay {
  date: Date;
  visits: Visit[];
  isCurrentMonth: boolean;
}

// Интерфейс для групп визитов (отображается при клике на день)
interface VisitGroup {
  title: string;
  visits: Visit[];
}

interface VisitCalendarProps {
  onClose?: () => void;
  openInModal?: boolean;
}

export const VisitCalendar: React.FC<VisitCalendarProps> = ({ onClose, openInModal = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDayVisits, setSelectedDayVisits] = useState<Visit[]>([]);
  const [visitGroups, setVisitGroups] = useState<VisitGroup[]>([]);
  
  // Цвета для статусов визитов
  const statusColors = {
    [VisitStatus.planned]: theme.palette.info.main,
    [VisitStatus.in_progress]: theme.palette.warning.main,
    [VisitStatus.completed]: theme.palette.success.main,
    [VisitStatus.failed]: theme.palette.error.main,
    [VisitStatus.cancelled]: theme.palette.grey[500],
  };

  // Загрузка визитов
  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const data = await visitService.getVisits();
        setVisits(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке визитов:', error);
        setIsLoading(false);
      }
    };

    fetchVisits();
  }, []);

  // Генерация данных календаря при изменении текущего месяца или данных визитов
  useEffect(() => {
    if (visits.length) {
      generateCalendarDays();
    }
  }, [currentDate, visits]);

  // Группировка визитов для выбранного дня
  useEffect(() => {
    if (selectedDayVisits.length > 0) {
      // Группируем визиты по статусу
      const groups: VisitGroup[] = [
        { title: 'Запланированные', visits: [] },
        { title: 'В работе', visits: [] },
        { title: 'Выполненные', visits: [] },
        { title: 'Проваленные', visits: [] },
        { title: 'Отмененные', visits: [] },
      ];
      
      selectedDayVisits.forEach(visit => {
        if (visit.status === VisitStatus.planned) {
          groups[0].visits.push(visit);
        } else if (visit.status === VisitStatus.in_progress) {
          groups[1].visits.push(visit);
        } else if (visit.status === VisitStatus.completed) {
          groups[2].visits.push(visit);
        } else if (visit.status === VisitStatus.failed) {
          groups[3].visits.push(visit);
        } else if (visit.status === VisitStatus.cancelled) {
          groups[4].visits.push(visit);
        }
      });
      
      // Фильтруем только группы, содержащие визиты
      setVisitGroups(groups.filter(group => group.visits.length > 0));
    } else {
      setVisitGroups([]);
    }
  }, [selectedDayVisits]);

  // Функция для генерации дней календаря
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Первый день месяца
    const firstDayOfMonth = new Date(year, month, 1);
    // День недели, с которого начинается месяц (0 - воскресенье)
    const startingDayOfWeek = firstDayOfMonth.getDay();
    // Корректируем, чтобы понедельник был первым днем недели
    const startingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    // Количество дней в текущем месяце
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Количество дней в предыдущем месяце
    const daysInPreviousMonth = new Date(year, month, 0).getDate();
    
    const days: CalendarDay[] = [];
    
    // Добавляем дни из предыдущего месяца
    for (let i = 0; i < startingDay; i++) {
      const date = new Date(year, month - 1, daysInPreviousMonth - startingDay + i + 1);
      days.push({
        date,
        visits: filterVisitsByDate(date),
        isCurrentMonth: false
      });
    }
    
    // Добавляем дни текущего месяца
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        visits: filterVisitsByDate(date),
        isCurrentMonth: true
      });
    }
    
    // Вычисляем оставшиеся ячейки для заполнения (до 42, что равно 6 строкам по 7 дней)
    const remainingDays = 42 - days.length;
    
    // Добавляем дни следующего месяца
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        visits: filterVisitsByDate(date),
        isCurrentMonth: false
      });
    }
    
    setCalendarDays(days);
  };

  // Фильтрация визитов по дате
  const filterVisitsByDate = (date: Date): Visit[] => {
    // Нормализуем дату, убирая время
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    return visits.filter(visit => {
      const visitDate = new Date(visit.date);
      visitDate.setHours(0, 0, 0, 0);
      return visitDate.getTime() === normalizedDate.getTime();
    });
  };

  // Переключение на предыдущий месяц
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Переключение на следующий месяц
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Обработка клика по дню
  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day.date);
    setSelectedDayVisits(day.visits);
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setSelectedDate(null);
    setSelectedDayVisits([]);
  };

  // Переход к деталям визита
  const handleViewVisit = (visitId: number) => {
    navigate(`/visits/${visitId}`);
    if (onClose) {
      onClose();
    }
  };

  // Форматирование даты для заголовка
  const formatMonthYear = (date: Date): string => {
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Компонент для отображения статуса визита
  const StatusIcon = ({ status }: { status: VisitStatus }) => {
    switch (status) {
      case VisitStatus.completed:
        return <CheckCircle fontSize="small" sx={{ color: statusColors[VisitStatus.completed] }} />;
      case VisitStatus.planned:
        return <PendingActions fontSize="small" sx={{ color: statusColors[VisitStatus.planned] }} />;
      case VisitStatus.in_progress:
        return <TimelineIcon fontSize="small" sx={{ color: statusColors[VisitStatus.in_progress] }} />;
      case VisitStatus.failed:
        return <ErrorIcon fontSize="small" sx={{ color: statusColors[VisitStatus.failed] }} />;
      case VisitStatus.cancelled:
        return <CancelIcon fontSize="small" sx={{ color: statusColors[VisitStatus.cancelled] }} />;
      default:
        return <PendingActions fontSize="small" sx={{ color: statusColors[VisitStatus.planned] }} />;
    }
  };

  // Названия дней недели
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const calendarContent = (
    <Box sx={{ width: '100%', mb: 2 }}>
      {/* Заголовок календаря с навигацией по месяцам */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: theme.shape.borderRadius,
      }}>
        <IconButton onClick={goToPreviousMonth}>
          <NavigateBefore />
        </IconButton>
        <Typography variant="h6">{formatMonthYear(currentDate)}</Typography>
        <IconButton onClick={goToNextMonth}>
          <NavigateNext />
        </IconButton>
      </Box>

      {/* Дни недели */}
      <Grid container spacing={1} sx={{ mb: 1 }}>
        {weekDays.map((day, index) => (
          <Grid item key={index} xs={12/7}>
            <Box sx={{ 
              textAlign: 'center',
              p: 1,
              fontWeight: 'bold',
            }}>
              {day}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Дни календаря */}
      <Grid container spacing={1}>
        {calendarDays.map((day, index) => {
          const isToday = day.date.toDateString() === new Date().toDateString();
          return (
            <Grid item key={index} xs={12/7}>
              <Paper 
                onClick={() => handleDayClick(day)}
                sx={{ 
                  p: 1, 
                  minHeight: 60,
                  cursor: 'pointer',
                  textAlign: 'center',
                  borderRadius: theme.shape.borderRadius,
                  bgcolor: day.isCurrentMonth 
                    ? isToday 
                      ? 'primary.light' 
                      : 'background.paper' 
                    : 'action.disabledBackground',
                  opacity: day.isCurrentMonth ? 1 : 0.5,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  transition: 'background-color 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: isToday ? 'bold' : 'normal',
                    color: isToday ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  {day.date.getDate()}
                </Typography>
                {day.visits.length > 0 && (
                  <Badge 
                    badgeContent={day.visits.length} 
                    color="primary"
                    sx={{ mt: 1 }}
                  />
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Модальное окно с визитами выбранного дня */}
      <Modal
        open={!!selectedDate}
        onClose={handleCloseModal}
        aria-labelledby="modal-visits-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card sx={{ 
          maxWidth: 600, 
          width: '100%', 
          maxHeight: '80vh',
          overflowY: 'auto',
          p: 3,
          bgcolor: 'background.paper',
          boxShadow: 24,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography id="modal-visits-title" variant="h6" component="h2">
              {selectedDate && (
                `Визиты на ${selectedDate.toLocaleDateString('ru-RU')}`
              )}
            </Typography>
            <IconButton onClick={handleCloseModal}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {selectedDayVisits.length === 0 ? (
            <Typography>На выбранный день нет визитов</Typography>
          ) : (
            <Stack spacing={3}>
              {visitGroups.map((group, groupIndex) => (
                <Box key={groupIndex}>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {group.title} ({group.visits.length})
                  </Typography>
                  <Stack spacing={2}>
                    {group.visits.map((visit) => (
                      <Paper 
                        key={visit.id}
                        elevation={0} 
                        variant="outlined" 
                        sx={{ p: 2 }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                          <Avatar sx={{ 
                            bgcolor: statusColors[visit.status],
                            mr: 2,
                          }}>
                            <StatusIcon status={visit.status} />
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1">
                              {visit.visit_type || 'Визит'} в {visit.company?.name || 'Компания не указана'}
                            </Typography>
                            {visit.comment && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {visit.comment}
                              </Typography>
                            )}
                            <Button 
                              variant="outlined" 
                              size="small" 
                              onClick={() => handleViewVisit(visit.id)}
                              sx={{ mt: 1 }}
                            >
                              Подробнее
                            </Button>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Card>
      </Modal>
    </Box>
  );

  // Если календарь открывается в модальном окне, оборачиваем контент
  if (openInModal && onClose) {
    return (
      <Box sx={{ 
        position: 'relative',
        maxWidth: 800,
        width: '100%',
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 3,
        borderRadius: theme.shape.borderRadius,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Календарь визитов</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Typography>Загрузка календаря...</Typography>
          </Box>
        ) : (
          calendarContent
        )}
      </Box>
    );
  }

  // Обычный режим отображения календаря
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Календарь визитов</Typography>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Typography>Загрузка календаря...</Typography>
        </Box>
      ) : (
        calendarContent
      )}
    </Paper>
  );
};

export default VisitCalendar;
