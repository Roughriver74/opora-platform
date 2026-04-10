import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  Modal,
  Divider,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  ListItemIcon,
  useMediaQuery,
} from '@mui/material';
import {
  Business,
  DateRange,
  AccountCircle,
  ExitToApp,
  ContactPhone,
  CalendarMonth,
  Settings,
  DeleteForever,
  LightMode,
  DarkMode,
  Person,
  ArrowBackIosNew,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { ClinicSearchDialog } from './ClinicSearchDialog';
import { BitrixCompany } from '../services/clinicService';
import VisitCalendar from './VisitCalendar';
import Sidebar from './Sidebar';
import { useSidebar } from '../context/SidebarContext';

// --- Constants ---
const APPBAR_HEIGHT = 60;
const BOTTOM_NAV_HEIGHT = 64;

// Bottom nav items
const bottomNavItems = [
  { label: 'Визиты', icon: <DateRange />, path: '/visits' },
  { label: 'Компании', icon: <Business />, path: '/companies' },
  { label: 'Контакты', icon: <ContactPhone />, path: '/contacts' },
  { label: 'Настройки', icon: <Settings />, path: '/admin' },
];

export const Layout: React.FC = ({ children }: { children?: React.ReactNode }) => {
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'org_admin' || user?.role === 'platform_admin';
  const isPlatformAdmin = user?.role === 'platform_admin';
  const { sidebarWidth } = useSidebar();

  // User menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Dialogs
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // --- Handlers ---
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleCloseMenu();
    navigate('/profile');
  };

  const handleLogout = () => {
    handleCloseMenu();
    localStorage.removeItem('token');
    navigate('/auth');
  };

  const handleCalendarToggle = () => {
    setCalendarOpen(prev => !prev);
  };

  const handleSelectClinic = (clinic: BitrixCompany) => {
    setSearchDialogOpen(false);
    navigate(`/companies/${clinic.ID}/edit`, {
      state: { bitrixId: clinic.ID, bitrixData: clinic },
    });
  };

  const handleCreateVisit = (clinic: BitrixCompany) => {
    setSearchDialogOpen(false);
    navigate(`/visits/new/${clinic.ID}`, {
      state: { companyId: clinic.ID, companyName: clinic.TITLE, companyInn: clinic.UF_CRM_1741267701427 },
    });
  };

  // --- Route matching ---
  const isActive = (path: string): boolean => {
    if (path === '/admin' && !location.pathname.startsWith('/admin')) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const bottomNavValue = bottomNavItems.findIndex(item => isActive(item.path));

  // --- User initials ---
  const userInitials = user
    ? [user.first_name, user.last_name].filter(Boolean).map(n => n?.charAt(0).toUpperCase()).join('') || user.email.charAt(0).toUpperCase()
    : '?';

  // Back button logic
  const isTopLevel = ['/', '/visits', '/companies', '/contacts', '/admin'].includes(location.pathname);
  const handleBack = () => navigate(-1);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: mode === 'dark' ? '#000000' : '#F2F2F7' }}>
      {/* Desktop Sidebar */}
      {isDesktop && <Sidebar />}

      {/* Main content wrapper */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          ...(isDesktop
            ? {
                ml: `${sidebarWidth}px`,
                transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }
            : {
                maxWidth: 600,
                mx: 'auto',
                width: '100%',
                position: 'relative',
                bgcolor: theme.palette.background.default,
              }),
        }}
      >
        {/* ======================== APPBAR ======================== */}
        <AppBar
          position={isDesktop ? 'sticky' : 'absolute'}
          elevation={0}
          sx={{
            bgcolor: theme.palette.background.paper + 'e6',
            backdropFilter: 'blur(10px)',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
            height: APPBAR_HEIGHT,
            top: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar,
          }}
        >
          <Toolbar
            disableGutters
            sx={{
              minHeight: `${APPBAR_HEIGHT}px !important`,
              height: APPBAR_HEIGHT,
              px: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Left: Back button (non-top-level) or Logo (mobile top-level) or nothing (desktop top-level) */}
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              {!isTopLevel ? (
                <IconButton edge="start" onClick={handleBack} sx={{ color: 'primary.main', ml: -1 }}>
                  <ArrowBackIosNew />
                </IconButton>
              ) : !isDesktop ? (
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.5px' }}>
                  ОПОРА
                </Typography>
              ) : null}
            </Box>

            {/* Center: Title on mobile non-top-level */}
            <Box sx={{ flex: 2, display: 'flex', justifyContent: 'center' }}>
              {!isDesktop && !isTopLevel && (
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
                  Детали
                </Typography>
              )}
            </Box>

            {/* Right: Calendar. User avatar ONLY on mobile */}
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
              <IconButton onClick={handleCalendarToggle} size="small" sx={{ color: 'primary.main' }}>
                <CalendarMonth />
              </IconButton>
              {!isDesktop && (
                <IconButton onClick={handleMenu} size="small" sx={{ ml: 0.5 }}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700, bgcolor: 'primary.main' }}>
                    {userInitials}
                  </Avatar>
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        {/* Global User Menu — mobile only */}
        {!isDesktop && (
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            PaperProps={{
              elevation: 8,
              sx: { mt: 1, minWidth: 220, borderRadius: 4, overflow: 'hidden' },
            }}
          >
            <Box sx={{ px: 2, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.email}
              </Typography>
            </Box>
            <MenuItem onClick={toggleTheme} sx={{ py: 1.5 }}>
              <ListItemIcon>{mode === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}</ListItemIcon>
              Тема: {mode === 'light' ? 'Светлая' : 'Тёмная'}
            </MenuItem>
            <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
              <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon> Профиль
            </MenuItem>
            {isAdmin && (
              <MenuItem onClick={() => { handleCloseMenu(); navigate('/admin/user-management'); }} sx={{ py: 1.5 }}>
                <ListItemIcon><Person fontSize="small" /></ListItemIcon> Пользователи
              </MenuItem>
            )}
            {isAdmin && (
              <MenuItem onClick={() => { handleCloseMenu(); navigate('/admin/delete-visits'); }} sx={{ py: 1.5 }}>
                <ListItemIcon><DeleteForever fontSize="small" /></ListItemIcon> Удаление визитов
              </MenuItem>
            )}
            {isAdmin && (
              <MenuItem onClick={() => { handleCloseMenu(); navigate('/admin/settings'); }} sx={{ py: 1.5 }}>
                <ListItemIcon><Settings fontSize="small" /></ListItemIcon> Настройки
              </MenuItem>
            )}
            {isPlatformAdmin && (
              <>
                <Divider />
                <MenuItem onClick={() => { handleCloseMenu(); navigate('/platform/organizations'); }} sx={{ py: 1.5 }}>
                  <ListItemIcon><Business fontSize="small" /></ListItemIcon> Платформа
                </MenuItem>
              </>
            )}
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
              <ListItemIcon sx={{ color: 'error.main' }}><ExitToApp fontSize="small" /></ListItemIcon> Выйти
            </MenuItem>
          </Menu>
        )}

        {/* ======================== CONTENT AREA ======================== */}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            pt: isDesktop ? 0 : `${APPBAR_HEIGHT}px`,
            pb: isDesktop ? 0 : `${BOTTOM_NAV_HEIGHT}px`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children ? children : <Outlet />}
        </Box>

        {/* ======================== MOBILE BOTTOM NAV ======================== */}
        {!isDesktop && (
          <Paper
            elevation={12}
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: theme.zIndex.appBar,
              borderTop: '1px solid',
              borderColor: 'divider',
              borderRadius: 0,
              bgcolor: theme.palette.background.paper + 'e6',
              backdropFilter: 'blur(10px)',
            }}
          >
            <BottomNavigation
              value={bottomNavValue >= 0 ? bottomNavValue : false}
              onChange={(_evt, newValue) => {
                if (bottomNavItems[newValue]) {
                  navigate(bottomNavItems[newValue].path);
                }
              }}
              sx={{
                height: BOTTOM_NAV_HEIGHT,
                bgcolor: 'transparent',
                '& .MuiBottomNavigationAction-root': {
                  color: 'text.secondary',
                  minWidth: 'auto',
                  pt: 1,
                  pb: 1,
                  '&.Mui-selected': {
                    color: 'primary.main',
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.6rem',
                    mb: 0.2,
                  },
                  '& .MuiBottomNavigationAction-label': {
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    '&.Mui-selected': {
                      fontSize: '0.65rem',
                    },
                  },
                },
              }}
            >
              {bottomNavItems.map(item => {
                if (item.path === '/admin' && !isAdmin) return null;
                return <BottomNavigationAction key={item.path} label={item.label} icon={item.icon} />;
              })}
            </BottomNavigation>
          </Paper>
        )}

        {/* ======================== DIALOGS ======================== */}
        <ClinicSearchDialog
          open={searchDialogOpen}
          onClose={() => setSearchDialogOpen(false)}
          onSelectClinic={handleSelectClinic}
          onCreateVisit={handleCreateVisit}
        />
        <Modal
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
        >
          <VisitCalendar openInModal={true} onClose={() => setCalendarOpen(false)} />
        </Modal>
      </Box>
    </Box>
  );
};
