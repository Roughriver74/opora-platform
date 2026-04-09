import { useState, useEffect } from 'react';
// В версии 3.1.2 используется экспорт по умолчанию
import jwt_decode from 'jwt-decode';

interface DecodedToken {
  sub: string;
  exp: number;
  is_admin: boolean;
  user_id: number;
  username: string;
  email: string;
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        console.log('Token found:', token);
        // Используем jwt_decode для декодирования токена
        const decoded = jwt_decode<DecodedToken>(token);
        console.log('Decoded token:', decoded);
        const currentTime = Date.now() / 1000;
        console.log('Current time:', currentTime, 'Token expiration:', decoded.exp);
        
        if (decoded.exp > currentTime) {
          setIsAuthenticated(true);
          setIsAdmin(decoded.is_admin || false);
          console.log('Is admin from token:', decoded.is_admin);
          setUserId(decoded.user_id);
          setUsername(decoded.username || '');
          setEmail(decoded.email || '');
        } else {
          // Токен истек
          console.log('Token expired');
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
      } catch (error) {
        // Ошибка декодирования токена
        console.error('Error decoding token:', error);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    }
    
    setLoading(false);
  }, []);

  return { isAuthenticated, isAdmin, userId, username, email, loading };
};
