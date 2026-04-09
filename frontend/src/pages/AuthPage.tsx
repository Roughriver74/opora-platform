import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Container,
  CircularProgress,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isServerAvailable, setIsServerAvailable] = useState<boolean | null>(null);
  const navigate = useNavigate();

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
          // Используем глобальный таймаут из api.ts
        });
        
        console.log('Успешный ответ от сервера:', response.status);
        return response.data;
      } catch (error: any) {
        console.error('Ошибка при авторизации:', error);
        
        // Более подробное логирование для диагностики
        if (error.response) {
          // Сервер вернул ответ с ошибкой
          console.error('Ответ сервера:', error.response.data);
          console.error('Статус ответа:', error.response.status);
          console.error('Заголовки ответа:', error.response.headers);
        } else if (error.request) {
          // Запрос был сделан, но ответ не получен
          console.error('Запрос был отправлен, но ответ не получен');
          console.error('Детали запроса:', error.request);
        } else {
          // Что-то случилось при настройке запроса
          console.error('Ошибка настройки запроса:', error.message);
        }
        
        throw error;
      }
    },
    {
      retry: 2, // Добавляем автоматические повторные попытки при ошибке
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Экспоненциальная задержка между попытками
      onSuccess: (data) => {
        console.log('Авторизация успешна, сохраняем токен');
        localStorage.setItem('token', data.access_token);
        // Также сохраняем время жизни токена
        const expiresAt = new Date().getTime() + (data.expires_in || 3600) * 1000;
        localStorage.setItem('token_expires_at', expiresAt.toString());
        
        // Задержка перед редиректом, чтобы убедиться, что токен сохранен
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
    // Удаляем токен при открытии страницы авторизации
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
    
    // Проверяем доступность сервера перед отправкой запроса
    if (isServerAvailable === false) {
      setError('Сервер API недоступен. Убедитесь, что бэкенд запущен и доступен.');
      return;
    }
    
    console.log('Отправка формы авторизации');
    loginMutation.mutate({ username: email, password });
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Система учёта визитов
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {isServerAvailable === false && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Сервер API недоступен. Убедитесь, что бэкенд запущен на порту 8000.
            </Alert>
          )}

          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Вход в систему
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              disabled={loginMutation.isLoading || isServerAvailable === false}
            />
            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={loginMutation.isLoading || isServerAvailable === false}
            />
            <Button
              fullWidth
              variant="contained"
              type="submit"
              sx={{ mt: 3 }}
              disabled={loginMutation.isLoading || isServerAvailable === false}
            >
              {loginMutation.isLoading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};
