import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

// Define User type with regions
export interface User {
  id: number;
  email: string;
  is_admin: boolean;
  regions: string[];
  bitrix_id?: number;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Set the token in the API
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Get user info
          const response = await api.get('/users/me');
          setUser(response.data);
        } catch (error) {
          console.error('Authentication error:', error);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Добавляем отладочную информацию
      console.log('Attempting to login with email:', email);
      // Базовый URL уже содержит /api, поэтому используем правильный маршрут
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user } = response.data;
      
      // Store token
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Set user
      setUser(user);
      
      // Redirect to home
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear token and user data
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    navigate('/login');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
