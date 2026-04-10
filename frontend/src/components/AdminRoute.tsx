import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminDomainGuard from './AdminDomainGuard';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Компонент для защиты административных маршрутов.
 * Допускает org_admin и platform_admin.
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading, isOrgAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // org_admin and platform_admin both have admin access
  if (!user || !isOrgAdmin) {
    console.log('AdminRoute: Access denied for role', user?.role);
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <AdminDomainGuard>{children}</AdminDomainGuard>;
};

export default AdminRoute;

/**
 * Компонент для защиты маршрутов платформенного администратора.
 * Допускает только platform_admin.
 */
export const PlatformAdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading, isPlatformAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || !isPlatformAdmin) {
    console.log('PlatformAdminRoute: Access denied for role', user?.role);
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <AdminDomainGuard>{children}</AdminDomainGuard>;
};
