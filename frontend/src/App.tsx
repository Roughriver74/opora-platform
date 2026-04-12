import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CircularProgress, Box } from '@mui/material';
import { OporaThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import AuthProvider from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import AdminRoute, { PlatformAdminRoute } from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded page components
const VisitsPage = lazy(() => import('./pages/VisitsPage').then(m => ({ default: m.VisitsPage })));
const VisitDetailsPage = lazy(() => import('./pages/VisitDetailsPage').then(m => ({ default: m.VisitDetailsPage })));
const VisitCreatePage = lazy(() => import('./pages/VisitCreatePage').then(m => ({ default: m.VisitCreatePage })));
const ClinicEditPage = lazy(() => import('./pages/ClinicEditPage'));
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const InviteAcceptPage = lazy(() => import('./pages/InviteAcceptPage').then(m => ({ default: m.InviteAcceptPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const FieldMappingPage = lazy(() => import('./pages/admin/FieldMappingPage'));
const ContactsListPage = lazy(() => import('./pages/ContactsListPage'));
const ContactEditPage = lazy(() => import('./pages/ContactEditPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const CompaniesListPage = lazy(() => import('./pages/CompaniesListPage'));
const NetworkClinicsListPage = lazy(() => import('./pages/NetworkClinicsListPage'));
const GlobalSettingsPage = lazy(() => import('./pages/admin/GlobalSettingsPage'));
const NetworkClinicEditPage = lazy(() => import('./pages/NetworkClinicEditPage'));
const DeleteVisits = lazy(() => import('./pages/admin/DeleteVisits'));
// Legacy VisitFormEditorPage removed — replaced by FormBuilderPage
const BillingPage = lazy(() => import('./pages/admin/BillingPage'));
const FormBuilderPage = lazy(() => import('./components/FormBuilder/FormBuilderPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const PlatformOrganizationsPage = lazy(() => import('./pages/platform/PlatformOrganizationsPage'));
const PlatformDashboardPage = lazy(() => import('./pages/platform/PlatformDashboardPage'));
const PlatformUsersPage = lazy(() => import('./pages/platform/PlatformUsersPage'));
const PlatformOrgDetailPage = lazy(() => import('./pages/platform/PlatformOrgDetailPage'));
const PlatformPaymentsPage = lazy(() => import('./pages/platform/PlatformPaymentsPage'));
const AnalyticsDashboardPage = lazy(() => import('./pages/AnalyticsDashboardPage'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));

// Full-page loading spinner shown while lazy chunks are being fetched
const PageLoader = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
  >
    <CircularProgress size={48} />
  </Box>
);

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

const HomeRedirect: React.FC = () => {
  const stored = localStorage.getItem('user');
  if (stored) {
    try {
      const user = JSON.parse(stored);
      if (user.role === 'platform_admin') {
        return <Navigate to="/platform/dashboard" replace />;
      }
    } catch { /* ignore */ }
  }
  return <Navigate to="/visits" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OporaThemeProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/invite/:token" element={<InviteAcceptPage />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <AuthProvider>
                  <SidebarProvider>
                    <ErrorBoundary>
                      <Layout />
                    </ErrorBoundary>
                  </SidebarProvider>
                </AuthProvider>
              </ProtectedRoute>
            }>
              <Route index element={<HomeRedirect />} />
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
              <Route path="profile" element={<ProfilePage />} />
              {/* Административные маршруты с проверкой прав */}
              <Route path="admin/field-mapping" element={<AdminRoute><FieldMappingPage /></AdminRoute>} />
              <Route path="/admin/delete-visits" element={<AdminRoute><DeleteVisits /></AdminRoute>} />
              <Route path="admin/user-management" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
              <Route path="admin/settings" element={<AdminRoute><GlobalSettingsPage /></AdminRoute>} />
              <Route path="admin/billing" element={<AdminRoute><BillingPage /></AdminRoute>} />
              {/* Legacy visit-form redirects to form-builder */}
              <Route path="admin/visit-form" element={<Navigate to="/admin/form-builder" replace />} />
              <Route path="admin/form-builder" element={<AdminRoute><FormBuilderPage /></AdminRoute>} />
              <Route path="analytics" element={<AnalyticsDashboardPage />} />
              <Route path="help" element={<HelpPage />} />
                {/* Platform admin */}
              <Route path="platform/dashboard" element={<PlatformAdminRoute><PlatformDashboardPage /></PlatformAdminRoute>} />
              <Route path="platform/organizations" element={<PlatformAdminRoute><PlatformOrganizationsPage /></PlatformAdminRoute>} />
              <Route path="platform/organizations/:id" element={<PlatformAdminRoute><PlatformOrgDetailPage /></PlatformAdminRoute>} />
              <Route path="platform/users" element={<PlatformAdminRoute><PlatformUsersPage /></PlatformAdminRoute>} />
              <Route path="platform/payments" element={<PlatformAdminRoute><PlatformPaymentsPage /></PlatformAdminRoute>} />
            </Route>

            {/* Onboarding — protected (requires token) but no sidebar/layout */}
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <OnboardingWizard />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </OporaThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
