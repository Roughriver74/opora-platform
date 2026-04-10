import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
// Не импортируем Layout, так как он уже используется в маршрутизации
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Интерфейс для глобальных настроек
interface GlobalSettings {
  id: number;
  key: string;
  value: string;
  description?: string;
}

// Компонент страницы глобальных настроек
export const GlobalSettingsPage: React.FC = () => {
  // Используем контекст аутентификации для проверки прав администратора
  const { user, isLoading: authLoading } = useAuth();
  
  // Отладочная информация
  console.log('GlobalSettingsPage - User:', user);
  console.log('GlobalSettingsPage - Is admin:', user?.is_admin);
  
  // Все хуки должны быть вызваны до условного рендеринга
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // Состояние для настройки ограничения прошедших дат
  const [restrictPastDates, setRestrictPastDates] = useState(false);
  
  // Получение глобальных настроек с сервера
  const { data: settings, isLoading, error } = useQuery<GlobalSettings[]>(
    ['globalSettings'],
    () => adminApi.getGlobalSettings(),
    {
      onSuccess: (data: GlobalSettings[]) => {
        // Находим настройку restrict_past_dates и устанавливаем значение переключателя
        const pastDatesSetting = data?.find(setting => setting.key === 'restrict_past_dates');
        if (pastDatesSetting) {
          setRestrictPastDates(pastDatesSetting.value === 'true');
        }
      },
      staleTime: 60000, // 1 минута
      // Не выполнять запрос, если пользователь не администратор
      enabled: !authLoading && user?.is_admin === true
    }
  );

  // Мутация для обновления настроек
  const updateSettingMutation = useMutation(
    (setting: { key: string; value: string; description?: string }) => 
      adminApi.updateGlobalSetting(setting.key, {
        key: setting.key,
        value: setting.value,
        description: setting.description
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['globalSettings']);
        setSnackbarMessage('Настройки успешно сохранены');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      },
      onError: (error: unknown) => {
        console.error('Error updating setting:', error);
        setSnackbarMessage('Ошибка при сохранении настроек');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      },
    }
  );
  
  // Если пользователь не администратор, перенаправляем на главную
  if (!authLoading && (!user || !user.is_admin)) {
    console.log('GlobalSettingsPage - Access denied: User is not an admin');
    return <Navigate to="/" replace />;
  }

  // Обработчик изменения переключателя ограничения прошедших дат
  const handleRestrictPastDatesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRestrictPastDates(event.target.checked);
  };

  // Обработчик сохранения настроек
  const handleSaveSettings = () => {
    updateSettingMutation.mutate({
      key: 'restrict_past_dates',
      value: restrictPastDates.toString(),
    });
  };

  // Обработчик закрытия снэкбара
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <>
      <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
        <Typography variant="h5" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <SettingsIcon sx={{ mr: 1 }} />
          Глобальные настройки
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            Ошибка при загрузке настроек. Пожалуйста, попробуйте позже.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Настройки визитов
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={restrictPastDates}
                          onChange={handleRestrictPastDatesChange}
                          color="primary"
                        />
                      }
                      label="Запретить создание и редактирование визитов с прошедшими датами"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
                      Если включено, пользователи не смогут создавать или редактировать визиты с датами ранее текущего дня.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
            disabled={isLoading || updateSettingMutation.isLoading}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
              boxShadow: 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-1px)',
              },
            }}
          >
            {updateSettingMutation.isLoading ? (
              <React.Fragment>
                <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                Сохранение...
              </React.Fragment>
            ) : (
              'Сохранить настройки'
            )}
          </Button>
        </Box>
      </Box>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default GlobalSettingsPage;
