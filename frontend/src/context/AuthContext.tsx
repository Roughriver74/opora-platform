import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

// Role types for multi-tenancy
export type UserRole = 'platform_admin' | 'org_admin' | 'user';

// Define User type with regions and multi-tenancy fields
export interface User {
  id: number;
  email: string;
  is_admin: boolean;
  role: UserRole;
  organization_id?: number;
  organization_name?: string;
  regions: string[];
  bitrix_id?: number;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  isOrgAdmin: boolean;
  isRegularUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  setAuthFromToken: (access_token: string, userData: any) => void;
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

// Helper to normalize user data from API responses
const normalizeUser = (userData: any): User => {
  // Determine role: use explicit role field, or fallback from is_admin
  let role: UserRole = 'user';
  if (userData.role) {
    role = userData.role as UserRole;
  } else if (userData.is_admin) {
    role = 'org_admin';
  }

  // Determine is_admin from role for backward compatibility
  const is_admin = role === 'org_admin' || role === 'platform_admin';

  return {
    id: userData.id,
    email: userData.email,
    is_admin,
    role,
    organization_id: userData.organization_id,
    organization_name: userData.organization_name,
    regions: userData.regions || [],
    bitrix_id: userData.bitrix_id || userData.bitrix_user_id,
    first_name: userData.first_name,
    last_name: userData.last_name,
  };
};

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
          setUser(normalizeUser(response.data));
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
      console.log('Attempting to login with email:', email);
      const response = await api.post('/auth/login', { email, password });
      const { access_token, user: userData } = response.data;

      // Store token
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      // Set user with normalized data
      setUser(normalizeUser(userData));

      // Redirect to visits
      navigate('/visits');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Set auth state from an external token (used by register/invite pages)
  const setAuthFromToken = (access_token: string, userData: any) => {
    localStorage.setItem('token', access_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(normalizeUser(userData));
  };

  const logout = () => {
    // Clear token and user data
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    navigate('/auth');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const isAuthenticated = !!user;
  const isPlatformAdmin = user?.role === 'platform_admin';
  const isOrgAdmin = user?.role === 'org_admin' || isPlatformAdmin;
  const isRegularUser = user?.role === 'user';

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      isPlatformAdmin,
      isOrgAdmin,
      isRegularUser,
      login,
      logout,
      updateUser,
      setAuthFromToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
