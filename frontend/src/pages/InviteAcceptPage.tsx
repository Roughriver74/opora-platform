import React, { useState } from 'react';
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
  Paper,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  DarkModeOutlined,
  LightModeOutlined,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useThemeMode } from '../context/ThemeContext';

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mode, toggleTheme } = useThemeMode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName || !lastName || !password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (!token) {
      setError('Токен приглашения не найден');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/accept-invite', {
        token,
        password,
        first_name: firstName,
        last_name: lastName,
      });

      const { access_token } = response.data;

      // Store token and redirect
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      navigate('/visits');
    } catch (err: any) {
      console.error('Invite accept error:', err);
      if (err.response?.status === 400 || err.response?.status === 404) {
        setError('Приглашение недействительно или истекло.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Ошибка при принятии приглашения. Попробуйте позже.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          mode === 'dark'
            ? theme.palette.background.default
            : `linear-gradient(170deg, ${theme.palette.background.default} 0%, ${theme.palette.primary.main}08 50%, ${theme.palette.secondary.main}0A 100%)`,
        px: 2,
      }}
    >
      {/* Theme toggle */}
      <IconButton
        onClick={toggleTheme}
        aria-label="Переключить тему"
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 10,
          bgcolor: theme.palette.background.paper,
          backdropFilter: 'blur(8px)',
          color: theme.palette.text.primary,
          boxShadow: theme.shadows[2],
          '&:hover': {
            bgcolor: theme.palette.action.hover,
          },
        }}
      >
        {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
      </IconButton>

      <Fade in timeout={600}>
        <Paper
          elevation={isMobile ? 0 : 8}
          sx={{
            width: '100%',
            maxWidth: 440,
            p: { xs: 3, sm: 4 },
            borderRadius: 3,
            bgcolor: isMobile ? 'transparent' : theme.palette.background.paper,
          }}
        >
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography
              sx={{
                fontSize: '2rem',
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
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 0.5,
              textAlign: 'center',
            }}
          >
            Принять приглашение
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              mb: 3,
              textAlign: 'center',
            }}
          >
            Заполните данные для создания аккаунта
          </Typography>

          {error && (
            <Fade in>
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  '& .MuiAlert-message': { width: '100%' },
                }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            </Fade>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <TextField
                fullWidth
                label="Имя"
                variant="outlined"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={isSubmitting}
                autoFocus
              />
              <TextField
                fullWidth
                label="Фамилия"
                variant="outlined"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </Box>
            <TextField
              fullWidth
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              sx={{ mb: 3 }}
              autoComplete="new-password"
              helperText="Минимум 6 символов"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      disabled={isSubmitting}
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
              disabled={isSubmitting}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
                boxShadow: isSubmitting
                  ? 'none'
                  : `0 4px 14px 0 ${theme.palette.primary.main}40`,
                '&:hover': {
                  boxShadow: `0 6px 20px 0 ${theme.palette.primary.main}50`,
                },
              }}
            >
              {isSubmitting ? (
                <>
                  <CircularProgress size={22} sx={{ mr: 1.5 }} color="inherit" />
                  Создание аккаунта...
                </>
              ) : (
                'Принять приглашение'
              )}
            </Button>
          </form>
        </Paper>
      </Fade>
    </Box>
  );
};
