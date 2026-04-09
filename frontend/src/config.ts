// Определяем базовый URL в зависимости от окружения
export const getBaseUrl = () => {
  // В production режиме API доступен по относительному пути
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  // В режиме разработки используем localhost
  return process.env.REACT_APP_API_URL || 'http://localhost:4201/api';
};

// API URL для использования в сервисах
export const API_URL = getBaseUrl();
