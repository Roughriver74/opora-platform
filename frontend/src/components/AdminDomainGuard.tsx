import React from 'react';
import { useLocation } from 'react-router-dom';

const ADMIN_DOMAIN = process.env.REACT_APP_ADMIN_DOMAIN || '';

/**
 * Если задан REACT_APP_ADMIN_DOMAIN — редиректит все admin-маршруты
 * на admin-поддомен, сохраняя путь и query-параметры.
 * В dev-режиме (REACT_APP_ADMIN_DOMAIN не задан) — пропускает всё как есть.
 */
const AdminDomainGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  if (!ADMIN_DOMAIN) return <>{children}</>;

  const currentHost = window.location.hostname;
  if (currentHost === ADMIN_DOMAIN) return <>{children}</>;

  const adminUrl = `https://${ADMIN_DOMAIN}${location.pathname}${location.search}`;
  window.location.replace(adminUrl);
  return null;
};

export default AdminDomainGuard;
