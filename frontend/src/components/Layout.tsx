import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Tooltip,
  Modal,
  Divider,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Business,
  DateRange,
  Person,
  AccountCircle,
  ExitToApp,
  ContactPhone,
  CalendarMonth,
  Settings,
  DeleteForever,
  LightMode,
  DarkMode,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { ClinicSearchDialog } from './ClinicSearchDialog';
import { BitrixCompany } from '../services/clinicService';
import VisitCalendar from './VisitCalendar';

// --- Constants ---
const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPSED = 72;
const APPBAR_HEIGHT = 56;
const BOTTOM_NAV_HEIGHT = 64;
const SIDEBAR_STATE_KEY = 'opora-sidebar-expanded';

// --- Navigation items ---
const mainNavItems = [
  { text: 'Визиты', icon: <DateRange />, path: '/visits' },
  { text: 'Компании', icon: <Business />, path: '/companies' },
  { text: 'Контакты', icon: <ContactPhone />, path: '/contacts' },
];

const adminNavItems = [
  { text: 'Поля и маппинг', icon: <Settings />, path: '/admin/field-mapping' },
  { text: 'Пользователи', icon: <Person />, path: '/admin/user-management' },
  { text: 'Настройки', icon: <Settings />, path: '/admin/settings' },
  { text: 'Удаление визитов', icon: <DeleteForever />, path: '/admin/delete-visits' },
];

// Bottom nav items for mobile
const bottomNavItems = [
  { label: 'Визиты', icon: <DateRange />, path: '/visits' },
  { label: 'Компании', icon: <Business />, path: '/companies' },
  { label: 'Контакты', icon: <ContactPhone />, path: '/contacts' },
];

// --- Helper: read sidebar state from localStorage ---
const getStoredSidebarState = (): boolean => {
  try {
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
};

// --- Component ---
interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const isAdmin = user?.is_admin || false;

  // Sidebar
  const [sidebarExpanded, setSidebarExpanded] = useState(getStoredSidebarState);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // User menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Dialogs
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarExpanded));
    }
  }, [sidebarExpanded, isMobile]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // --- Handlers ---
  const toggleSidebar = useCallback(() => {
    setSidebarExpanded(prev => !prev);
  }, []);

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
      state: {
        bitrixId: clinic.ID,
        bitrixData: clinic,
      },
    });
  };

  const handleCreateVisit = (clinic: BitrixCompany) => {
    setSearchDialogOpen(false);
    navigate(`/visits/new/${clinic.ID}`, {
      state: {
        companyId: clinic.ID,
        companyName: clinic.TITLE,
        companyInn: clinic.UF_CRM_1741267701427,
      },
    });
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  // --- Route matching ---
  const isActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Bottom nav value for mobile
  const bottomNavValue = bottomNavItems.findIndex(item => isActive(item.path));

  // --- User initials for avatar ---
  const userInitials = user
    ? [user.first_name, user.last_name]
        .filter(Boolean)
        .map(n => n?.charAt(0).toUpperCase())
        .join('') || user.email.charAt(0).toUpperCase()
    : '?';

  // --- Computed sidebar width ---
  const sidebarWidth = sidebarExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  // ================================================================
  // SIDEBAR CONTENT (shared between desktop persistent & mobile drawer)
  // ================================================================
  const renderNavItem = (
    item: { text: string; icon: React.ReactElement; path: string },
    collapsed: boolean,
  ) => {
    const active = isActive(item.path);

    const button = (
      <ListItemButton
        onClick={() => handleNavClick(item.path)}
        sx={{
          minHeight: 44,
          mx: collapsed ? 0.75 : 1.5,
          px: collapsed ? 0 : 1.5,
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: '10px',
          mb: 0.25,
          position: 'relative',
          bgcolor: active ? 'primary.main' : 'transparent',
          color: active ? 'primary.contrastText' : 'text.secondary',
          '&:hover': {
            bgcolor: active
              ? 'primary.dark'
              : theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.04)',
          },
          transition: 'all 0.15s ease',
          // Active left accent
          '&::before': active
            ? {
                content: '""',
                position: 'absolute',
                left: collapsed ? -3 : -12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 3,
                height: 20,
                borderRadius: '0 3px 3px 0',
                bgcolor: 'primary.main',
              }
            : undefined,
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 40,
            justifyContent: 'center',
            color: active ? 'primary.contrastText' : 'text.secondary',
            transition: 'color 0.15s ease',
          }}
        >
          {item.icon}
        </ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={item.text}
            primaryTypographyProps={{
              fontSize: '0.875rem',
              fontWeight: active ? 600 : 500,
              noWrap: true,
            }}
          />
        )}
      </ListItemButton>
    );

    return (
      <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
        {collapsed ? (
          <Tooltip title={item.text} placement="right" arrow>
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </ListItem>
    );
  };

  const renderSidebarContent = (collapsed: boolean) => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Logo area */}
      <Box
        sx={{
          height: APPBAR_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          px: collapsed ? 0 : 2.5,
          flexShrink: 0,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            fontSize: collapsed ? '1rem' : '1.25rem',
            color: 'primary.main',
            letterSpacing: collapsed ? 0 : '0.02em',
            userSelect: 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {collapsed ? 'O' : 'ОПОРА'}
        </Typography>
      </Box>

      <Divider sx={{ mx: collapsed ? 0.75 : 1.5, opacity: 0.5 }} />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        <List disablePadding>
          {mainNavItems.map(item => renderNavItem(item, collapsed))}
        </List>

        {isAdmin && (
          <>
            <Divider sx={{ mx: collapsed ? 0.75 : 1.5, my: 1.5, opacity: 0.5 }} />
            {!collapsed && (
              <Typography
                variant="overline"
                sx={{
                  px: 3,
                  py: 0.5,
                  display: 'block',
                  color: 'text.secondary',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  lineHeight: 2,
                }}
              >
                Администрирование
              </Typography>
            )}
            <List disablePadding>
              {adminNavItems.map(item => renderNavItem(item, collapsed))}
            </List>
          </>
        )}
      </Box>

      {/* Collapse toggle (desktop only) */}
      {!isMobile && (
        <Box
          sx={{
            flexShrink: 0,
            p: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Tooltip title={collapsed ? 'Развернуть' : 'Свернуть'} placement="right" arrow>
            <IconButton
              onClick={toggleSidebar}
              size="small"
              sx={{
                width: '100%',
                borderRadius: '10px',
                color: 'text.secondary',
                '&:hover': {
                  bgcolor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.04)',
                },
              }}
            >
              {collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {/* ======================== APPBAR ======================== */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.default',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
          height: APPBAR_HEIGHT,
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${APPBAR_HEIGHT}px !important`,
            height: APPBAR_HEIGHT,
            px: { xs: 1.5, md: 2.5 },
          }}
        >
          {/* Mobile hamburger */}
          {isMobile && (
            <IconButton
              edge="start"
              onClick={() => setMobileDrawerOpen(true)}
              sx={{ mr: 1, color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo in AppBar (mobile only, since desktop has it in sidebar) */}
          {isMobile && (
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 800,
                color: 'primary.main',
                letterSpacing: '0.02em',
                flexGrow: 1,
                userSelect: 'none',
              }}
            >
              ОПОРА
            </Typography>
          )}

          {/* Spacer for desktop */}
          {!isMobile && <Box sx={{ flexGrow: 1 }} />}

          {/* Right side actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Calendar button */}
            <Tooltip title="Календарь визитов">
              <IconButton
                onClick={handleCalendarToggle}
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                  transition: 'color 0.15s ease',
                }}
              >
                <CalendarMonth fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Theme toggle */}
            <Tooltip title={mode === 'light' ? 'Темная тема' : 'Светлая тема'}>
              <IconButton
                onClick={toggleTheme}
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'warning.main' },
                  transition: 'color 0.15s ease',
                }}
              >
                {mode === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
              </IconButton>
            </Tooltip>

            {/* User avatar + dropdown */}
            <Tooltip title={user?.email || 'Пользователь'}>
              <IconButton
                onClick={handleMenu}
                size="small"
                sx={{ ml: 0.5 }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  }}
                >
                  {userInitials}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              id="user-menu"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{
                paper: {
                  elevation: 3,
                  sx: {
                    mt: 1,
                    minWidth: 180,
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'visible',
                  },
                },
              }}
            >
              {/* User info header */}
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {user?.first_name && user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.email}
                </Typography>
                {user?.first_name && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {user.email}
                  </Typography>
                )}
              </Box>
              <MenuItem
                onClick={handleProfile}
                sx={{ py: 1.25, fontSize: '0.875rem' }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                Профиль
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={handleLogout}
                sx={{ py: 1.25, fontSize: '0.875rem', color: 'error.main' }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: 'error.main' }}>
                  <ExitToApp fontSize="small" />
                </ListItemIcon>
                Выйти
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ======================== DESKTOP SIDEBAR ======================== */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '& .MuiDrawer-paper': {
              width: sidebarWidth,
              boxSizing: 'border-box',
              border: 'none',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.default',
              transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              overflowX: 'hidden',
            },
          }}
        >
          {renderSidebarContent(sidebarExpanded ? false : true)}
        </Drawer>
      )}

      {/* ======================== MOBILE DRAWER ======================== */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
              bgcolor: 'background.paper',
              borderRight: 'none',
            },
          }}
        >
          {renderSidebarContent(false)}
        </Drawer>
      )}

      {/* ======================== MAIN CONTENT ======================== */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Toolbar spacer */}
        <Box sx={{ height: APPBAR_HEIGHT, flexShrink: 0 }} />

        {/* Content area */}
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 2.5, md: 3 },
            pb: { xs: `${BOTTOM_NAV_HEIGHT + 16}px`, md: 3 },
            maxWidth: '100%',
            overflow: 'auto',
          }}
        >
          {children ? children : <Outlet />}
        </Box>
      </Box>

      {/* ======================== MOBILE BOTTOM NAV ======================== */}
      {isMobile && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar,
            borderTop: '1px solid',
            borderColor: 'divider',
            borderRadius: 0,
          }}
        >
          <BottomNavigation
            value={bottomNavValue >= 0 ? bottomNavValue : false}
            onChange={(_event, newValue) => {
              if (bottomNavItems[newValue]) {
                navigate(bottomNavItems[newValue].path);
              }
            }}
            sx={{
              height: BOTTOM_NAV_HEIGHT,
              bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.default',
              '& .MuiBottomNavigationAction-root': {
                color: 'text.secondary',
                minWidth: 'auto',
                '&.Mui-selected': {
                  color: 'primary.main',
                },
              },
            }}
          >
            {bottomNavItems.map(item => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}

      {/* ======================== DIALOGS & MODALS ======================== */}

      {/* Clinic search dialog */}
      <ClinicSearchDialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        onSelectClinic={handleSelectClinic}
        onCreateVisit={handleCreateVisit}
      />

      {/* Visit calendar modal */}
      <Modal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        aria-labelledby="visit-calendar-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <VisitCalendar
          openInModal={true}
          onClose={() => setCalendarOpen(false)}
        />
      </Modal>
    </Box>
  );
};
