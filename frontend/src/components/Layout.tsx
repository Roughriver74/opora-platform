import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  Tooltip,
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
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.is_admin || false;

  // User menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Dialogs
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Scroll visibility for Appbar if needed (optional, keeping it sticky for now)

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

  // Back button logic: check if we are on a deeper route.
  // For simplicity, anything that isn't a top-level tab might offer a back button.
  const isTopLevel = ['/', '/visits', '/companies', '/contacts', '/admin'].includes(location.pathname);
  const handleBack = () => navigate(-1);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: mode === 'dark' ? '#000000' : '#F2F2F7', // iOS style background color
      }}
    >
      {/* Render Mobile Wrapper on Desktop, or 100% on Mobile */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 600, // Fixed width on desktop
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: theme.palette.background.default,
          boxShadow: isDesktop ? theme.shadows[10] : 'none',
          overflow: 'hidden',
        }}
      >
        {/* ======================== ENHANCED APPBAR ======================== */}
        <AppBar
          position="absolute"
          elevation={0}
          sx={{
            bgcolor: theme.palette.background.paper + 'e6', // slightly transparent
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
            {/* Left Action: Back button or Logo */}
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              {!isTopLevel ? (
                <IconButton edge="start" onClick={handleBack} sx={{ color: 'primary.main', ml: -1 }}>
                  <ArrowBackIosNew />
                </IconButton>
              ) : (
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.5px' }}>
                  ОПОРА
                </Typography>
              )}
            </Box>

            {/* Center: Title (optional, shown when not on top level) */}
            <Box sx={{ flex: 2, display: 'flex', justifyContent: 'center' }}>
              {!isTopLevel && (
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
                  {/* Could extract title dynamically, keeping generic for now */}
                  Детали
                </Typography>
              )}
            </Box>

            {/* Right Action: Global Menu / Calendar */}
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
              <IconButton onClick={handleCalendarToggle} size="small" sx={{ color: 'primary.main' }}>
                <CalendarMonth />
              </IconButton>
              <IconButton onClick={handleMenu} size="small" sx={{ ml: 0.5 }}>
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700, bgcolor: 'primary.main' }}>
                  {userInitials}
                </Avatar>
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Global User Menu */}
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
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
            <ListItemIcon sx={{ color: 'error.main' }}><ExitToApp fontSize="small" /></ListItemIcon> Выйти
          </MenuItem>
        </Menu>

        {/* ======================== CONTENT AREA ======================== */}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            pt: `${APPBAR_HEIGHT}px`,     // Content padding top
            pb: `${BOTTOM_NAV_HEIGHT}px`, // Content padding bottom
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Outlet or Children rendering */}
          {children ? children : <Outlet />}
        </Box>

        {/* ======================== MOBILE BOTTOM NAV ======================== */}
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
                  }
                }
              },
            }}
          >
            {bottomNavItems.map(item => {
              // Hide Admin tab if not admin
              if (item.path === '/admin' && !isAdmin) return null;
              return <BottomNavigationAction key={item.path} label={item.label} icon={item.icon} />;
            })}
          </BottomNavigation>
        </Paper>

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
