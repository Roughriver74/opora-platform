import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Avatar,
  Divider,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  DateRange,
  Business,
  ContactPhone,
  Settings,
  ChevronLeft,
  ChevronRight,
  Person,
  DeleteForever,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar, SIDEBAR_WIDTH } from '../context/SidebarContext';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const mainItems: NavItem[] = [
  { label: 'Визиты', icon: <DateRange />, path: '/visits' },
  { label: 'Компании', icon: <Business />, path: '/companies' },
  { label: 'Контакты', icon: <ContactPhone />, path: '/contacts' },
];

const adminItems: NavItem[] = [
  { label: 'Настройки', icon: <Settings />, path: '/admin' },
  { label: 'Пользователи', icon: <Person />, path: '/admin/user-management' },
  { label: 'Удаление визитов', icon: <DeleteForever />, path: '/admin/delete-visits' },
];

const platformAdminItems: NavItem[] = [
  { label: 'Платформа', icon: <AdminPanelSettings />, path: '/platform/organizations' },
];

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName[0].toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
}

function isActive(pathname: string, itemPath: string): boolean {
  // Special case for /admin: exact match to avoid /admin/user-management matching /admin
  if (itemPath === '/admin') {
    return pathname === '/admin';
  }
  return pathname.startsWith(itemPath);
}

const Sidebar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isOrgAdmin, isPlatformAdmin } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const drawerWidth = isCollapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded;

  const renderNavItem = (item: NavItem) => {
    const active = isActive(location.pathname, item.path);

    const button = (
      <ListItemButton
        key={item.path}
        onClick={() => navigate(item.path)}
        selected={active}
        sx={{
          minHeight: 48,
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          px: isCollapsed ? 0 : 2,
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          '&.Mui-selected': {
            backgroundColor: theme.palette.primary.main + '20',
            color: theme.palette.primary.main,
            '& .MuiListItemIcon-root': {
              color: theme.palette.primary.main,
            },
            '&:hover': {
              backgroundColor: theme.palette.primary.main + '30',
            },
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: isCollapsed ? 0 : 40,
            justifyContent: 'center',
            color: active ? theme.palette.primary.main : theme.palette.text.secondary,
          }}
        >
          {item.icon}
        </ListItemIcon>
        {!isCollapsed && (
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              fontSize: 14,
              fontWeight: active ? 600 : 400,
              color: active ? theme.palette.primary.main : theme.palette.text.primary,
              noWrap: true,
            }}
          />
        )}
      </ListItemButton>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.path} title={item.label} placement="right" arrow>
          {button}
        </Tooltip>
      );
    }

    return button;
  };

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
    : '';

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          overflowX: 'visible',
          overflowY: 'auto',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
          borderRight: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          px: isCollapsed ? 0 : 2,
          flexShrink: 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        {!isCollapsed && (
          <Typography
            variant="h6"
            fontWeight={700}
            color="primary"
            noWrap
            sx={{ letterSpacing: 1 }}
          >
            ОПОРА
          </Typography>
        )}
        {isCollapsed && (
          <Typography
            variant="h6"
            fontWeight={700}
            color="primary"
            sx={{ letterSpacing: 1 }}
          >
            О
          </Typography>
        )}
        <IconButton
          onClick={toggleSidebar}
          size="small"
          sx={{
            ml: isCollapsed ? 0 : 1,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
            ...(isCollapsed && {
              position: 'absolute',
              right: -12,
              zIndex: 1,
              width: 24,
              height: 24,
              boxShadow: theme.shadows[2],
            }),
          }}
        >
          {isCollapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
        </IconButton>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        <List disablePadding>
          {mainItems.map(renderNavItem)}
        </List>

        {isOrgAdmin && (
          <>
            <Divider sx={{ my: 1, mx: 2 }} />
            <List disablePadding>
              {adminItems.map(renderNavItem)}
            </List>
          </>
        )}

        {isPlatformAdmin && (
          <>
            <Divider sx={{ my: 1, mx: 2 }} />
            <List disablePadding>
              {platformAdminItems.map(renderNavItem)}
            </List>
          </>
        )}
      </Box>

      {/* Footer */}
      <Divider />
      <Box
        onClick={() => navigate('/profile')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: isCollapsed ? 0 : 2,
          py: 1.5,
          cursor: 'pointer',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }}
      >
        <Tooltip title={isCollapsed ? displayName : ''} placement="right" arrow>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              flexShrink: 0,
            }}
          >
            {getInitials(user?.first_name, user?.last_name, user?.email)}
          </Avatar>
        </Tooltip>
        {!isCollapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              color="text.primary"
            >
              {displayName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
            >
              {user?.email}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default Sidebar;
