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
  TextField,
  Collapse,
  IconButton,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/adminApi';
// Не импортируем Layout, так как он уже используется в маршрутизации
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
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

  // Состояние для настроек Bitrix24
  const [bitrix24Enabled, setBitrix24Enabled] = useState(false);
  const [bitrix24WebhookUrl, setBitrix24WebhookUrl] = useState('');
  const [bitrix24SmartProcessId, setBitrix24SmartProcessId] = useState('');
  const [bitrix24TestResult, setBitrix24TestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [bitrix24Testing, setBitrix24Testing] = useState(false);
  const [bitrix24Saving, setBitrix24Saving] = useState(false);
  const [bitrix24InfoOpen, setBitrix24InfoOpen] = useState(false);

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
        // Находим настройки Bitrix24
        const enabledSetting = data?.find(setting => setting.key === 'bitrix24_enabled');
        if (enabledSetting) {
          setBitrix24Enabled(enabledSetting.value === 'true');
        }
        const webhookSetting = data?.find(setting => setting.key === 'bitrix24_webhook_url');
        if (webhookSetting) {
          setBitrix24WebhookUrl(webhookSetting.value || '');
        }
        const smartProcessSetting = data?.find(setting => setting.key === 'bitrix24_smart_process_visit_id');
        if (smartProcessSetting) {
          setBitrix24SmartProcessId(smartProcessSetting.value || '');
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

  // Обработчик тестирования подключения к Bitrix24
  const handleTestBitrix24Connection = async () => {
    if (!bitrix24WebhookUrl.trim()) {
      setBitrix24TestResult({ success: false, message: 'Введите URL вебхука' });
      return;
    }
    setBitrix24Testing(true);
    setBitrix24TestResult(null);
    try {
      const result = await adminApi.testBitrix24Connection(bitrix24WebhookUrl);
      setBitrix24TestResult(result);
    } catch (err: any) {
      setBitrix24TestResult({
        success: false,
        message: err?.response?.data?.message || 'Ошибка при проверке подключения',
      });
    } finally {
      setBitrix24Testing(false);
    }
  };

  // Обработчик сохранения настроек Bitrix24
  const handleSaveBitrix24Settings = async () => {
    setBitrix24Saving(true);
    try {
      await Promise.all([
        adminApi.updateGlobalSetting('bitrix24_enabled', {
          key: 'bitrix24_enabled',
          value: bitrix24Enabled.toString(),
          description: 'Включить интеграцию с Bitrix24',
        }),
        adminApi.updateGlobalSetting('bitrix24_webhook_url', {
          key: 'bitrix24_webhook_url',
          value: bitrix24WebhookUrl,
          description: 'URL вебхука Bitrix24',
        }),
        adminApi.updateGlobalSetting('bitrix24_smart_process_visit_id', {
          key: 'bitrix24_smart_process_visit_id',
          value: bitrix24SmartProcessId,
          description: 'ID смарт-процесса визитов в Bitrix24',
        }),
      ]);
      queryClient.invalidateQueries(['globalSettings']);
      setSnackbarMessage('Настройки Bitrix24 успешно сохранены');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error saving Bitrix24 settings:', err);
      setSnackbarMessage('Ошибка при сохранении настроек Bitrix24');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setBitrix24Saving(false);
    }
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
            {/* Секция интеграции с Bitrix24 */}
            <Grid item xs={12}>
              <Card elevation={3}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LinkIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">
                      Интеграция с Bitrix24
                    </Typography>
                  </Box>

                  {/* Переключатель включения */}
                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={bitrix24Enabled}
                          onChange={(e) => setBitrix24Enabled(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Включить интеграцию с Bitrix24"
                    />
                  </Box>

                  {/* Поля настройки (видны только при включенной интеграции) */}
                  <Collapse in={bitrix24Enabled}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      {/* Webhook URL */}
                      <TextField
                        fullWidth
                        label="Webhook URL"
                        placeholder="https://your-domain.bitrix24.ru/rest/user_id/webhook_key/"
                        value={bitrix24WebhookUrl}
                        onChange={(e) => {
                          setBitrix24WebhookUrl(e.target.value);
                          setBitrix24TestResult(null);
                        }}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          sx: { fontFamily: 'monospace', fontSize: '0.9rem' },
                        }}
                      />

                      {/* Smart Process ID */}
                      <TextField
                        fullWidth
                        label="ID смарт-процесса визитов"
                        placeholder="Например: 1054"
                        value={bitrix24SmartProcessId}
                        onChange={(e) => {
                          // Разрешаем только цифры
                          const val = e.target.value.replace(/\D/g, '');
                          setBitrix24SmartProcessId(val);
                        }}
                        variant="outlined"
                        size="small"
                        type="text"
                        inputMode="numeric"
                        helperText="Найдите в Bitrix24: CRM -> Смарт-процессы -> ID нужного процесса"
                      />

                      {/* Кнопка тестирования и результат */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                          <Button
                            variant="outlined"
                            color="primary"
                            onClick={handleTestBitrix24Connection}
                            disabled={bitrix24Testing || !bitrix24WebhookUrl.trim()}
                            sx={{
                              textTransform: 'none',
                              borderRadius: 1.5,
                              minWidth: 200,
                            }}
                          >
                            {bitrix24Testing ? (
                              <React.Fragment>
                                <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                                Проверка...
                              </React.Fragment>
                            ) : (
                              'Проверить подключение'
                            )}
                          </Button>
                        </Box>

                        {/* Результат тестирования */}
                        {bitrix24TestResult && (
                          <Alert
                            severity={bitrix24TestResult.success ? 'success' : 'error'}
                            icon={bitrix24TestResult.success ? <CheckCircleIcon /> : <ErrorIcon />}
                            sx={{ borderRadius: 1.5 }}
                          >
                            {bitrix24TestResult.success
                              ? 'Подключение успешно!'
                              : bitrix24TestResult.message}
                          </Alert>
                        )}
                      </Box>

                      {/* Кнопка сохранения настроек Bitrix24 */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<SaveIcon />}
                          onClick={handleSaveBitrix24Settings}
                          disabled={bitrix24Saving}
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
                          {bitrix24Saving ? (
                            <React.Fragment>
                              <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                              Сохранение...
                            </React.Fragment>
                          ) : (
                            'Сохранить настройки Bitrix24'
                          )}
                        </Button>
                      </Box>
                    </Box>
                  </Collapse>

                  {/* Информационная секция с инструкцией */}
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                        '&:hover': { opacity: 0.8 },
                      }}
                      onClick={() => setBitrix24InfoOpen(!bitrix24InfoOpen)}
                    >
                      <HelpOutlineIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Как настроить интеграцию с Bitrix24
                      </Typography>
                      <IconButton size="small" sx={{ ml: 'auto' }}>
                        {bitrix24InfoOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                    <Collapse in={bitrix24InfoOpen}>
                      <Box
                        sx={{
                          mt: 1.5,
                          p: 2,
                          borderRadius: 1.5,
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.04)'
                              : 'rgba(0,0,0,0.02)',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" component="div">
                          <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 1 } }}>
                            <li>
                              Зайдите в Bitrix24 &rarr; <strong>Разработчикам</strong> &rarr; <strong>Вебхуки</strong>
                            </li>
                            <li>
                              Создайте входящий вебхук с правами: <strong>crm</strong>, <strong>task</strong>
                            </li>
                            <li>
                              Скопируйте URL вебхука и вставьте в поле выше
                            </li>
                            <li>
                              Укажите ID смарт-процесса для визитов
                            </li>
                            <li>
                              Нажмите <strong>&laquo;Проверить подключение&raquo;</strong> для проверки связи
                            </li>
                          </Box>
                        </Typography>
                      </Box>
                    </Collapse>
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
