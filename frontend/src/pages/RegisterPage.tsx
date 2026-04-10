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
  Link as MuiLink,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  DarkModeOutlined,
  LightModeOutlined,
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useThemeMode } from '../context/ThemeContext';

export const RegisterPage: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
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

    if (!firstName || !lastName || !email || !password || !companyName) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/register-org', {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        company_name: companyName,
      });

      const { access_token, user } = response.data;

      // Store token and redirect
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      navigate('/visits');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Ошибка при регистрации. Попробуйте позже.');
      }
    } finally {
      setIsSubmitting(false);
    }
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

  // -- Registration form --
  const RegisterForm = () => (
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
            Регистрация
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              mb: 3,
            }}
          >
            Создайте аккаунт для вашей компании
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
            <TextField
              fullWidth
              label="Название компании"
              variant="outlined"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={isSubmitting}
              sx={{ mb: 2 }}
              autoFocus={!isMobile}
            />
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <TextField
                fullWidth
                label="Имя"
                variant="outlined"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={isSubmitting}
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
              label="Email"
              type="email"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              sx={{ mb: 2 }}
              autoComplete="email"
            />
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
                  Создание...
                </>
              ) : (
                'Создать аккаунт'
              )}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2.5 }}>
              <Typography variant="body2" color="text.secondary">
                Уже есть аккаунт?{' '}
                <MuiLink
                  component={Link}
                  to="/auth"
                  sx={{
                    fontWeight: 600,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Войти
                </MuiLink>
              </Typography>
            </Box>
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
        ...(isMobile && {
          background:
            mode === 'dark'
              ? theme.palette.background.default
              : `linear-gradient(170deg, ${theme.palette.background.default} 0%, ${theme.palette.primary.main}08 50%, ${theme.palette.secondary.main}0A 100%)`,
        }),
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
      <BrandedPanel />

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
        <RegisterForm />
      </Box>
    </Box>
  );
};
