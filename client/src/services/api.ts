import axios from 'axios';

// Базовый URL для API
// Используем относительный путь для API, чтобы запросы шли на тот же сервер, где размещен фронтенд
const API_URL = process.env.REACT_APP_API_URL || '/api';

console.log('Using API URL:', API_URL); // Для отладки

// Создание экземпляра axios с базовым URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена авторизации к запросам
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок аутентификации
api.interceptors.response.use(
  response => response,
  error => {
    // Если сервер вернул 401 Unauthorized, очищаем токен
    if (error.response && error.response.status === 401) {
      console.log('Unauthorized, clearing token');
      localStorage.removeItem('adminToken');
    }
    return Promise.reject(error);
  }
);

export default api;
