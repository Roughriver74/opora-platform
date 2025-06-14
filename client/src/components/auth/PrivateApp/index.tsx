import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../../contexts/auth';
import { LoginForm } from '../LoginForm';
import Layout from '../../layout/Layout';
import HomePage from '../../../pages/HomePage';
import AdminPage from '../../../pages/admin/AdminPage';
import MySubmissions from '../../user/MySubmissions';

export const PrivateApp: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Логирование состояния для отладки
  console.log('PrivateApp render:', { isAuthenticated, isLoading, userRole: user?.role });

  // Показываем загрузку пока проверяем авторизацию
  if (isLoading) {
    console.log('PrivateApp: показываем загрузку');
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Роут для входа */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginForm />
          } 
        />
        
        {/* Защищенные роуты */}
        {isAuthenticated ? (
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/my-submissions" element={<MySubmissions />} />
                {user?.role === 'admin' && (
                  <Route path="/admin/*" element={<AdminPage />} />
                )}
                {/* Перенаправление на главную для неизвестных роутов */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          } />
        ) : (
          /* Если не авторизован, перенаправляем на логин */
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
}; 