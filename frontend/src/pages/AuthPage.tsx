import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Fade,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  DarkModeOutlined,
  LightModeOutlined,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useThemeMode } from '../context/ThemeContext';

export const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isServerAvailable, setIsServerAvailable] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mode, toggleTheme } = useThemeMode();

  // Проверка доступности сервера при загрузке страницы
  useEffect(() => {
    const checkServerAvailability = async () => {
      try {
        // Используем HEAD запрос для проверки доступности сервера с минимальным трафиком
        await api.head('/health', { timeout: 5000 });
        setIsServerAvailable(true);
      } catch (error) {
        console.error('Сервер API недоступен:', error);
        setIsServerAvailable(false);
        setError('Сервер API недоступен. Убедитесь, что бэкенд запущен и доступен.');
      }
    };

    checkServerAvailability();
  }, []);

  const loginMutation = useMutation(
    async (credentials: { username: string; password: string }) => {
      try {
        console.log('Попытка авторизации для:', credentials.username);

        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);

        const response = await api.post('/token', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        console.log('Успешный ответ от сервера:', response.status);
        return response.data;
      } catch (error: any) {
        console.error('Ошибка при авторизации:', error);

        if (error.response) {
          console.error('Ответ сервера:', error.response.data);
          console.error('Статус ответа:', error.response.status);
          console.error('Заголовки ответа:', error.response.headers);
        } else if (error.request) {
          console.error('Запрос был отправлен, но ответ не получен');
          console.error('Детали запроса:', error.request);
        } else {
          console.error('Ошибка настройки запроса:', error.message);
        }

        throw error;
      }
    },
    {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      onSuccess: (data) => {
        console.log('Авторизация успешна, сохраняем токен');
        localStorage.setItem('token', data.access_token);
        const expiresAt = new Date().getTime() + (data.expires_in || 3600) * 1000;
        localStorage.setItem('token_expires_at', expiresAt.toString());

        setTimeout(() => {
          navigate('/visits');
        }, 500);
      },
      onError: (error: any) => {
        console.error('Ошибка в обработчике onError:', error);

        let errorMessage = 'Ошибка авторизации. Пожалуйста, проверьте ваши учетные данные.';

        if (error.response) {
          if (error.response.status === 401) {
            errorMessage = 'Неправильный email или пароль';
          } else if (error.response.status === 500) {
            errorMessage = 'Ошибка на сервере. Пожалуйста, попробуйте позже или обратитесь к администратору.';
          } else if (error.response.data?.detail) {
            errorMessage = error.response.data.detail;
          }
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Сервер не отвечает. Убедитесь, что бэкенд запущен и доступен.';
          setIsServerAvailable(false);
        } else if (error.message && error.message.includes('Network Error')) {
          errorMessage = 'Ошибка сети. Проверьте подключение к интернету и доступность сервера.';
          setIsServerAvailable(false);
        }

        setError(errorMessage);
      },
    }
  );

  // Очистка токена при входе на страницу авторизации
  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('token_expires_at');
    console.log('Токен авторизации удален при входе на страницу авторизации');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (isServerAvailable === false) {
      setError('Сервер API недоступен. Убедитесь, что бэкенд запущен и доступен.');
      return;
    }

    console.log('Отправка формы авторизации');
    loginMutation.mutate({ username: email, password });
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  // -- Branded left panel (desktop only) --
  const BrandedPanel = () => (
    <Box
      sx={{
        width: '55%',
        minHeight: '100vh',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
      }}
    >
      {/* Decorative shapes */}
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '50%',
          height: '50%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '60%',
          height: '60%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '40%',
          right: '5%',
          width: '20%',
          height: '20%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
        }}
      />

      <Fade in timeout={800}>
        <Box sx={{ textAlign: 'center', zIndex: 1, px: 4 }}>
          <Typography
            sx={{
              fontSize: { md: '4rem', lg: '5rem' },
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '0.12em',
              lineHeight: 1.1,
              mb: 3,
              textShadow: '0 2px 24px rgba(0,0,0,0.18)',
            }}
          >
            OPORA
          </Typography>
          <Typography
            sx={{
              fontSize: { md: '1rem', lg: '1.15rem' },
              color: 'rgba(255,255,255,0.78)',
              fontWeight: 400,
              maxWidth: 380,
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Платформа управления визитами и активностями
          </Typography>
        </Box>
      </Fade>
    </Box>
  );

  // -- Login form content --
  const LoginForm = () => (
    <Box
      sx={{
        width: '100%',
        maxWidth: 400,
        mx: 'auto',
      }}
    >
      {/* Mobile logo */}
      {isMobile && (
        <Fade in timeout={600}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              sx={{
                fontSize: '2.4rem',
                fontWeight: 800,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.1em',
                mb: 0.5,
              }}
            >
              OPORA
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 400,
              }}
            >
              Платформа управления визитами
            </Typography>
          </Box>
        </Fade>
      )}

      <Fade in timeout={isMobile ? 800 : 600}>
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 0.5,
            }}
          >
            Вход в систему
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              mb: 4,
            }}
          >
            Введите данные для доступа к платформе
          </Typography>

          {error && (
            <Fade in>
              <Alert
                severity="error"
                sx={{
                  mb: 2.5,
                  borderRadius: 2,
                  '& .MuiAlert-message': { width: '100%' },
                }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            </Fade>
          )}

          {isServerAvailable === false && !error && (
            <Fade in>
              <Alert
                severity="warning"
                sx={{
                  mb: 2.5,
                  borderRadius: 2,
                }}
              >
                Сервер API недоступен. Проверьте подключение к серверу.
              </Alert>
            </Fade>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              label="Email"
              type="email"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loginMutation.isLoading || isServerAvailable === false}
              sx={{ mb: 2.5 }}
              autoComplete="email"
              autoFocus={!isMobile}
            />
            <TextField
              fullWidth
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loginMutation.isLoading || isServerAvailable === false}
              sx={{ mb: 3.5 }}
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      onClick={handleTogglePassword}
                      edge="end"
                      size="small"
                      disabled={loginMutation.isLoading || isServerAvailable === false}
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              disabled={loginMutation.isLoading || isServerAvailable === false}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                boxShadow: loginMutation.isLoading
                  ? 'none'
                  : `0 4px 14px 0 ${theme.palette.primary.main}40`,
                '&:hover': {
                  boxShadow: `0 6px 20px 0 ${theme.palette.primary.main}50`,
                },
              }}
            >
              {loginMutation.isLoading ? (
                <>
                  <CircularProgress size={22} sx={{ mr: 1.5 }} color="inherit" />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </Button>

            <Typography align="center" variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Нет аккаунта?{' '}
              <Typography
                component="span"
                variant="body2"
                sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => navigate('/register')}
              >
                Зарегистрироваться
              </Typography>
            </Typography>
          </form>
        </Box>
      </Fade>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        // Mobile: subtle gradient background
        ...(isMobile && {
          background:
            mode === 'dark'
              ? theme.palette.background.default
              : `linear-gradient(170deg, ${theme.palette.background.default} 0%, ${theme.palette.primary.main}08 50%, ${theme.palette.secondary.main}0A 100%)`,
        }),
      }}
    >
      {/* Theme toggle button -- always top right */}
      <IconButton
        onClick={toggleTheme}
        aria-label="Переключить тему"
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 10,
          bgcolor: isMobile
            ? theme.palette.background.paper
            : 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          color: isMobile ? theme.palette.text.primary : '#FFFFFF',
          boxShadow: isMobile ? theme.shadows[2] : 'none',
          '&:hover': {
            bgcolor: isMobile
              ? theme.palette.action.hover
              : 'rgba(255,255,255,0.25)',
          },
        }}
      >
        {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
      </IconButton>

      {/* Left branded panel (desktop) */}
      {BrandedPanel()}

      {/* Right side / form panel */}
      <Box
        sx={{
          width: { xs: '100%', md: '45%' },
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, sm: 6, md: 6, lg: 8 },
          py: { xs: 6, md: 4 },
          bgcolor: { md: theme.palette.background.paper },
        }}
      >
        {LoginForm()}
      </Box>
    </Box>
  );
};
