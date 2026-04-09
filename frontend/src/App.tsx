import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from './theme';
import { Layout } from './components/Layout';
import { VisitsPage } from './pages/VisitsPage';
import { VisitDetailsPage } from './pages/VisitDetailsPage';
import { VisitCreatePage } from './pages/VisitCreatePage';
import ClinicEditPage from './pages/ClinicEditPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import FieldMappingPage from './pages/admin/FieldMappingPage';
import ContactsListPage from './pages/ContactsListPage';
import ContactEditPage from './pages/ContactEditPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import CompaniesListPage from './pages/CompaniesListPage';
import NetworkClinicsListPage from './pages/NetworkClinicsListPage';
import GlobalSettingsPage from './pages/admin/GlobalSettingsPage';
import AuthProvider from './context/AuthContext';
import AdminRoute from './components/AdminRoute';
import NetworkClinicEditPage from './pages/NetworkClinicEditPage';
import DeleteVisits from './pages/admin/DeleteVisits';

// Create a client for React Query
const queryClient = new QueryClient();

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <AuthProvider>
                  <Layout />
                </AuthProvider>
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/visits" replace />} />
              <Route path="visits" element={<VisitsPage />} />
              <Route path="visits/new" element={<VisitCreatePage />} />
              <Route path="visits/new/:companyId" element={<VisitCreatePage />} />
              <Route path="visits/:id" element={<VisitDetailsPage />} />
              <Route path="companies/:id/edit" element={<ClinicEditPage />} />
              <Route path="companies" element={<CompaniesListPage />} />
              <Route path="networkClinics/:bitrixId" element={<NetworkClinicsListPage />} />
              <Route path="networkClinics/:bitrixId/edit" element={<NetworkClinicEditPage />} />
              <Route path="contacts" element={<ContactsListPage />} />
              <Route path="contacts/new" element={<ContactEditPage />} />
              <Route path="contacts/:id" element={<ContactEditPage />} />
              <Route path="doctors" element={<div>Doctors Page (Coming Soon)</div>} />
              <Route path="profile" element={<ProfilePage />} />
              {/* Административные маршруты с проверкой прав */}
              <Route path="admin/field-mapping" element={<AdminRoute><FieldMappingPage /></AdminRoute>} />
              <Route path="/admin/delete-visits" element={<AdminRoute><DeleteVisits /></AdminRoute>} />
              <Route path="admin/user-management" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
              <Route path="admin/settings" element={<AdminRoute><GlobalSettingsPage /></AdminRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
