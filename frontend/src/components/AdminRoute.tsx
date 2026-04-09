import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
// Используем контекст аутентификации
import { useAuth } from '../context/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Компонент для защиты административных маршрутов
 * Проверяет, является ли пользователь администратором
 * Если нет, перенаправляет на главную страницу
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  // Используем контекст аутентификации
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Отладочная информация
  console.log('AdminRoute - User:', user);
  console.log('AdminRoute - Is admin:', user?.is_admin);
  console.log('AdminRoute - Is loading:', isLoading);

  // Пока проверяем права, показываем загрузку
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Если пользователь не авторизован или не администратор, перенаправляем на главную
  if (!user || !user.is_admin) {
    console.log('Access denied: User is not an admin');
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Если пользователь администратор, показываем защищенный контент
  return <>{children}</>;
};

export default AdminRoute;
