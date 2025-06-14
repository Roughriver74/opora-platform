import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../../contexts/auth';
import { LoginForm } from '../LoginForm';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Показываем загрузку пока проверяем авторизацию
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Если не авторизован, показываем форму входа
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Если авторизован, показываем защищенный контент
  return <>{children}</>;
}; 