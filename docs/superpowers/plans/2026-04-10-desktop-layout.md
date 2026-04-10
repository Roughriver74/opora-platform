# Desktop Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible sidebar and adaptive card grid to give the OPORA platform a full desktop experience while preserving the existing mobile layout.

**Architecture:** New `SidebarContext` manages collapsed/expanded state (persisted in localStorage). A new `Sidebar` component renders navigation on desktop. `Layout.tsx` conditionally renders either desktop (sidebar + full-width content) or mobile (current 600px container + BottomNav) based on the `md` (900px) breakpoint. All list pages get adaptive grid (1→2→3 columns). Edit pages get wider form containers.

**Tech Stack:** React 18, MUI v5 (Drawer, Grid, useMediaQuery), TypeScript, localStorage

**Spec:** `docs/superpowers/specs/2026-04-10-desktop-layout-design.md`
**Mockup:** `docs/mockups/desktop-layout.html`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `frontend/src/context/SidebarContext.tsx` | Sidebar collapsed/expanded state + localStorage persistence |
| `frontend/src/components/Sidebar.tsx` | Desktop sidebar navigation component |

### Modified Files
| File | Change |
|------|--------|
| `frontend/src/components/Layout.tsx` | Conditional desktop/mobile layout, render Sidebar on desktop, hide BottomNav on desktop |
| `frontend/src/pages/ClinicsListPage.tsx` | Adaptive card grid, desktop toolbar with inline create button |
| `frontend/src/pages/ContactsListPage.tsx` | Adaptive card grid, desktop toolbar with inline create button |
| `frontend/src/pages/NetworkClinicsListPage.tsx` | Adaptive card grid, desktop toolbar |
| `frontend/src/pages/VisitsPage.tsx` | Adaptive card grid, FAB → inline button on desktop |
| `frontend/src/pages/VisitCreatePage.tsx` | Wider form layout, 2-column fields on desktop |
| `frontend/src/pages/VisitDetailsPage.tsx` | Wider content, responsive adjustments |
| `frontend/src/pages/ClinicEditPage.tsx` | Already uses Container lg — minor padding tweaks |
| `frontend/src/pages/ContactEditPage.tsx` | Wider maxWidth (800→900), 2-column fields |
| `frontend/src/pages/NetworkClinicEditPage.tsx` | Wider container |
| `frontend/src/pages/ProfilePage.tsx` | Remove maxWidth: 600, use 900 on desktop |
| `frontend/src/pages/admin/UserManagementPage.tsx` | Wider content (already table-based) |
| `frontend/src/pages/admin/FieldMappingPage.tsx` | Wider content |
| `frontend/src/pages/admin/GlobalSettingsPage.tsx` | Wider content |
| `frontend/src/pages/admin/DeleteVisits.tsx` | Remove maxWidth: 600, use 900 |
| `frontend/src/pages/platform/PlatformOrganizationsPage.tsx` | Wider content |
| `frontend/src/App.tsx` (or root) | Wrap with `SidebarProvider` |

---

## Task 1: SidebarContext

**Files:**
- Create: `frontend/src/context/SidebarContext.tsx`

- [ ] **Step 1: Create SidebarContext**

```tsx
// frontend/src/context/SidebarContext.tsx
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  sidebarWidth: number;
  toggleSidebar: () => void;
}

const SIDEBAR_EXPANDED = 220;
const SIDEBAR_COLLAPSED = 64;
const STORAGE_KEY = 'sidebar-collapsed';

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  sidebarWidth: SIDEBAR_EXPANDED,
  toggleSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export const SIDEBAR_WIDTH = { expanded: SIDEBAR_EXPANDED, collapsed: SIDEBAR_COLLAPSED };

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  const value = useMemo(
    () => ({ isCollapsed, sidebarWidth, toggleSidebar }),
    [isCollapsed, sidebarWidth, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};
```

- [ ] **Step 2: Wrap app with SidebarProvider**

Open `frontend/src/App.tsx` (or wherever the root providers are). Wrap the existing provider tree with `<SidebarProvider>`:

```tsx
import { SidebarProvider } from './context/SidebarContext';

// In the component return, wrap existing content:
<SidebarProvider>
  {/* existing ThemeProvider, AuthProvider, Router, etc. */}
</SidebarProvider>
```

Place it **inside** ThemeProvider (needs MUI context) but **outside** Router (sidebar needs route info).

- [ ] **Step 3: Verify app still loads**

Run: `cd frontend && npm start`
Expected: App loads normally, no errors in console. No visual changes yet.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/context/SidebarContext.tsx frontend/src/App.tsx
git commit -m "feat: add SidebarContext for desktop sidebar state management"
```

---

## Task 2: Sidebar Component

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar component**

```tsx
// frontend/src/components/Sidebar.tsx
import React from 'react';
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

const navItems = [
  { label: 'Визиты', icon: <DateRange />, path: '/visits' },
  { label: 'Компании', icon: <Business />, path: '/companies' },
  { label: 'Контакты', icon: <ContactPhone />, path: '/contacts' },
];

const adminItems = [
  { label: 'Настройки', icon: <Settings />, path: '/admin' },
  { label: 'Пользователи', icon: <Person />, path: '/admin/user-management' },
  { label: 'Удаление визитов', icon: <DeleteForever />, path: '/admin/delete-visits' },
];

const platformItems = [
  { label: 'Платформа', icon: <AdminPanelSettings />, path: '/platform/organizations' },
];

const TRANSITION = 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)';

export const Sidebar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isCollapsed, sidebarWidth, toggleSidebar } = useSidebar();

  const isAdmin = user?.role === 'org_admin' || user?.role === 'platform_admin';
  const isPlatformAdmin = user?.role === 'platform_admin';

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin' || location.pathname === '/admin/settings';
    return location.pathname.startsWith(path);
  };

  const userInitials = user
    ? [user.first_name, user.last_name].filter(Boolean).map(n => n?.charAt(0).toUpperCase()).join('') || user.email.charAt(0).toUpperCase()
    : '?';

  const renderNavItem = (item: { label: string; icon: React.ReactNode; path: string }) => {
    const active = isActive(item.path);
    return (
      <Tooltip key={item.path} title={isCollapsed ? item.label : ''} placement="right">
        <ListItemButton
          onClick={() => navigate(item.path)}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            mx: 1,
            minHeight: 44,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            px: isCollapsed ? 1.5 : 2,
            bgcolor: active ? 'action.selected' : 'transparent',
            color: active ? 'primary.main' : 'text.secondary',
            '&:hover': { bgcolor: active ? 'action.selected' : 'action.hover' },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: isCollapsed ? 0 : 40,
              mr: isCollapsed ? 0 : 1.5,
              justifyContent: 'center',
              color: 'inherit',
            }}
          >
            {item.icon}
          </ListItemIcon>
          {!isCollapsed && (
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 500 }}
            />
          )}
        </ListItemButton>
      </Tooltip>
    );
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: sidebarWidth,
          transition: TRANSITION,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        },
      }}
    >
      {/* Header: Logo + Collapse Toggle */}
      <Box
        sx={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          px: isCollapsed ? 0 : 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: 'primary.main',
            letterSpacing: '-0.5px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {isCollapsed ? 'О' : 'ОПОРА'}
        </Typography>
        {!isCollapsed && (
          <IconButton size="small" onClick={toggleSidebar} sx={{ color: 'text.secondary' }}>
            <ChevronLeft />
          </IconButton>
        )}
        {isCollapsed && (
          <IconButton
            size="small"
            onClick={toggleSidebar}
            sx={{
              position: 'absolute',
              right: -12,
              top: 18,
              width: 24,
              height: 24,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 1,
              zIndex: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ChevronRight sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1.5 }}>
        <List disablePadding>
          {navItems.map(renderNavItem)}
        </List>

        {isAdmin && (
          <>
            <Divider sx={{ my: 1.5, mx: 2 }} />
            <List disablePadding>
              {adminItems.map(renderNavItem)}
            </List>
          </>
        )}

        {isPlatformAdmin && (
          <>
            <Divider sx={{ my: 1.5, mx: 2 }} />
            <List disablePadding>
              {platformItems.map(renderNavItem)}
            </List>
          </>
        )}
      </Box>

      {/* Footer: User Info */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          p: isCollapsed ? 1 : 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: isCollapsed ? 0 : 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => navigate('/profile')}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            fontSize: '0.85rem',
            fontWeight: 700,
            bgcolor: 'primary.main',
            flexShrink: 0,
          }}
        >
          {userInitials}
        </Avatar>
        {!isCollapsed && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.email}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};
```

- [ ] **Step 2: Verify file compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No type errors related to Sidebar.tsx.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.tsx
git commit -m "feat: add collapsible Sidebar component for desktop navigation"
```

---

## Task 3: Refactor Layout.tsx

**Files:**
- Modify: `frontend/src/components/Layout.tsx`

This is the critical change. The Layout must conditionally render either desktop or mobile shell.

- [ ] **Step 1: Add imports and desktop detection**

At top of Layout.tsx, add:

```tsx
import { Sidebar } from './Sidebar';
import { useSidebar } from '../context/SidebarContext';
```

Update the `isDesktop` variable (line 57) to use `md` breakpoint instead of `sm`:

```tsx
const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
```

Add sidebar width:

```tsx
const { sidebarWidth } = useSidebar();
```

- [ ] **Step 2: Replace outer wrapper**

Replace the outer `<Box>` structure (lines 130-361). The new structure:

**Desktop:** No maxWidth constraint, sidebar + offset content.
**Mobile:** Keep current 600px container + BottomNav.

Replace the outer return (starting at line 130 `return (`) with:

```tsx
return (
  <Box
    sx={{
      display: 'flex',
      minHeight: '100vh',
      bgcolor: mode === 'dark' ? '#000000' : '#F2F2F7',
    }}
  >
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
              // Desktop: offset by sidebar, no max-width constraint
              ml: `${sidebarWidth}px`,
              transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }
          : {
              // Mobile: centered 600px container
              maxWidth: 600,
              mx: 'auto',
              width: '100%',
              position: 'relative',
              bgcolor: theme.palette.background.default,
              boxShadow: 'none',
            }),
      }}
    >
      {/* AppBar */}
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
          zIndex: theme.zIndex.appBar,
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            minHeight: `${APPBAR_HEIGHT}px !important`,
            height: APPBAR_HEIGHT,
            px: isDesktop ? 3 : 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Back button (mobile) or Page title (desktop) */}
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {!isDesktop && !isTopLevel ? (
              <IconButton edge="start" onClick={handleBack} sx={{ color: 'primary.main', ml: -1 }}>
                <ArrowBackIosNew />
              </IconButton>
            ) : !isDesktop ? (
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.5px' }}>
                ОПОРА
              </Typography>
            ) : !isTopLevel ? (
              <IconButton edge="start" onClick={handleBack} sx={{ color: 'primary.main', ml: -1 }}>
                <ArrowBackIosNew />
              </IconButton>
            ) : null}
          </Box>

          {/* Center: Title (mobile non-top-level only) */}
          {!isDesktop && (
            <Box sx={{ flex: 2, display: 'flex', justifyContent: 'center' }}>
              {!isTopLevel && (
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
                  Детали
                </Typography>
              )}
            </Box>
          )}

          {/* Right: Actions */}
          <Box sx={{ flex: isDesktop ? 'none' : 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
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

      {/* User Menu (kept for mobile) */}
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
          {/* Keep all existing menu items unchanged */}
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

      {/* Content Area */}
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

      {/* Bottom Navigation — mobile only */}
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
                '&.Mui-selected': { color: 'primary.main' },
                '& .MuiSvgIcon-root': { fontSize: '1.6rem', mb: 0.2 },
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  '&.Mui-selected': { fontSize: '0.65rem' },
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

      {/* Dialogs — keep unchanged */}
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
```

- [ ] **Step 3: Verify desktop layout renders**

Run the app, open browser at 1200px+ width. Expected:
- Sidebar visible on the left with navigation items
- AppBar spans content area only (right of sidebar)
- BottomNavigation hidden
- Content area fills remaining width

Shrink to < 900px. Expected:
- Sidebar disappears
- BottomNavigation returns
- 600px centered container returns

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Layout.tsx
git commit -m "feat: refactor Layout for conditional desktop/mobile rendering"
```

---

## Task 4: ClinicsListPage — Adaptive Card Grid

**Files:**
- Modify: `frontend/src/pages/ClinicsListPage.tsx`

- [ ] **Step 1: Add desktop detection and Grid import**

At top, ensure `Grid` and `useMediaQuery` are imported (they already are). Add `Button` import if missing. The file already has `isMobile` at line 57 using `down('md')` — keep it.

- [ ] **Step 2: Replace card rendering section with adaptive grid**

Find the card rendering area (around line 703):

```tsx
{data?.items?.map((clinic: Clinic) => renderMobileClinicCard(clinic))}
```

Replace with:

```tsx
<Grid container spacing={2}>
  {data?.items?.map((clinic: Clinic) => (
    <Grid item xs={12} md={6} lg={4} key={clinic.id}>
      {renderMobileClinicCard(clinic)}
    </Grid>
  ))}
</Grid>
```

- [ ] **Step 3: Remove margin-bottom from card**

In `renderMobileClinicCard` (line 503), the Card has `mb: 2`. Remove it since Grid `spacing` now handles gaps:

```tsx
// Change:
<Card sx={{ mb: 2, position: 'relative' }} key={clinic.id}>
// To:
<Card sx={{ position: 'relative', height: '100%' }} key={clinic.id}>
```

Remove the `key` prop from Card (it's now on Grid item).

- [ ] **Step 4: Update FAB to hide on desktop, add inline button**

Find the FAB at the bottom of the file (around line 822-835). Wrap it in a condition:

```tsx
{isMobile && (
  <Fab
    color="primary"
    onClick={handleOpenCreateModal}
    sx={{
      position: 'fixed',
      bottom: 84,
      right: 20,
    }}
  >
    <AddCircleOutlineIcon fontSize="large" />
  </Fab>
)}
```

The "Создать компанию" button for desktop is already handled by the modal trigger — ensure there's a visible button in the toolbar area. If there isn't one, add above the card grid (inside the Card with FilterForm, around line 598):

```tsx
{!isMobile && (
  <Button
    variant="contained"
    startIcon={<AddCircleOutlineIcon />}
    onClick={handleOpenCreateModal}
    sx={{ mb: 2 }}
  >
    Создать компанию
  </Button>
)}
```

- [ ] **Step 5: Verify responsive grid**

Open app at desktop width — cards should display in 3 columns (lg) or 2 columns (md). On mobile — single column.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ClinicsListPage.tsx
git commit -m "feat: adaptive card grid and desktop toolbar for ClinicsListPage"
```

---

## Task 5: ContactsListPage — Adaptive Card Grid

**Files:**
- Modify: `frontend/src/pages/ContactsListPage.tsx`

- [ ] **Step 1: Add imports**

Add Grid import and useMediaQuery/useTheme:

```tsx
import {
  // ... existing imports
  Grid,
  useMediaQuery,
  useTheme,
  Button,
} from '@mui/material';
```

Add inside component:

```tsx
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
```

- [ ] **Step 2: Wrap contact cards in adaptive Grid**

Replace the card list section (lines 102-148). Currently each contact renders inside a single Card. Wrap the map in a Grid:

```tsx
<Grid container spacing={2}>
  {contacts?.map((contact: Contact, index: number) => {
    const email = contact.dynamic_fields?.email
      ? Array.isArray(contact.dynamic_fields.email)
        ? contact.dynamic_fields.email.map((item: any) => item.VALUE).join(', ')
        : contact.dynamic_fields.email
      : '';

    const phone = contact.dynamic_fields?.phone
      ? Array.isArray(contact.dynamic_fields.phone)
        ? contact.dynamic_fields.phone.map((item: any) => item.VALUE).join(', ')
        : contact.dynamic_fields.phone
      : '';

    return (
      <Grid item xs={12} md={6} lg={4} key={contact.id}>
        <Card sx={{ borderRadius: 4, overflow: 'hidden', height: '100%' }}>
          <CardActionArea onClick={() => navigate(`/contacts/${contact.id}`)}>
            <Box display="flex" alignItems="center" p={2}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <PersonIcon />
              </Avatar>
              <Box flexGrow={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {contact.name}
                </Typography>
                {phone && (
                  <Typography variant="body2" color="text.secondary">
                    {phone}
                  </Typography>
                )}
              </Box>
              <Box display="flex" flexDirection="column" alignItems="flex-end">
                <Chip
                  size="small"
                  label={contact.sync_status || 'unknown'}
                  color={getSyncStatusColor(contact.sync_status || 'unknown')}
                  sx={{ mb: 1, height: 20, fontSize: '0.7rem' }}
                />
                <ArrowForwardIosIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              </Box>
            </Box>
          </CardActionArea>
        </Card>
      </Grid>
    );
  })}
</Grid>
```

Note: The original used a single Card with Dividers between contacts. The new layout uses individual cards per contact inside a Grid, which works better for multi-column.

- [ ] **Step 3: Add desktop create button + conditional FAB**

Add an inline create button for desktop in the header area (around line 81):

```tsx
<Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
  <Typography variant="h5" sx={{ fontWeight: 700 }}>
    Контакты
  </Typography>
  <Box display="flex" gap={1}>
    {!isMobile && (
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => navigate('/contacts/new')}
        sx={{ borderRadius: '20px' }}
      >
        Создать контакт
      </Button>
    )}
    <LoadingButton
      variant="outlined"
      size="small"
      startIcon={<SyncIcon />}
      loading={syncMutation.isLoading}
      onClick={() => syncMutation.mutate()}
      sx={{ borderRadius: '20px' }}
    >
      Синхронизация
    </LoadingButton>
  </Box>
</Box>
```

Update FAB to mobile-only:

```tsx
{isMobile && (
  <Fab
    color="primary"
    onClick={() => navigate('/contacts/new')}
    sx={{
      position: 'fixed',
      bottom: 84,
      right: 20,
    }}
  >
    <AddIcon fontSize="large" />
  </Fab>
)}
```

- [ ] **Step 4: Verify and commit**

```bash
git add frontend/src/pages/ContactsListPage.tsx
git commit -m "feat: adaptive card grid and desktop toolbar for ContactsListPage"
```

---

## Task 6: VisitsPage — Adaptive Card Grid

**Files:**
- Modify: `frontend/src/pages/VisitsPage.tsx`

- [ ] **Step 1: Add desktop detection**

Add `useMediaQuery` and `useTheme` if not present:

```tsx
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
```

- [ ] **Step 2: Wrap visit cards in Grid**

Find where visit cards are rendered and wrap in adaptive grid:

```tsx
<Grid container spacing={2}>
  {visits.map((visit) => (
    <Grid item xs={12} md={6} lg={4} key={visit.id}>
      {/* existing visit card component */}
    </Grid>
  ))}
</Grid>
```

- [ ] **Step 3: FAB → conditional**

Update FAB (lines 195-209):

```tsx
{isMobile && (
  <Fab
    color="primary"
    onClick={/* existing handler */}
    sx={{
      position: 'fixed',
      bottom: 84,
      right: 20,
    }}
  >
    {/* existing icon */}
  </Fab>
)}
```

Add inline button for desktop in the header/toolbar area:

```tsx
{!isMobile && (
  <Button variant="contained" startIcon={/* icon */} onClick={/* existing handler */}>
    Создать визит
  </Button>
)}
```

- [ ] **Step 4: Verify and commit**

```bash
git add frontend/src/pages/VisitsPage.tsx
git commit -m "feat: adaptive card grid and desktop toolbar for VisitsPage"
```

---

## Task 7: NetworkClinicsListPage — Adaptive Card Grid

**Files:**
- Modify: `frontend/src/pages/NetworkClinicsListPage.tsx`

- [ ] **Step 1: Same pattern as ClinicsListPage**

The page already has `isMobile` (line 51, breakpoint `down('md')`). Apply the same changes:

1. Wrap card list in `<Grid container spacing={2}>` with `<Grid item xs={12} md={6} lg={4}>`
2. Remove `mb: 2` from individual cards, add `height: '100%'`
3. Make FAB conditional: `{isMobile && <Fab ...>}`
4. Add inline create button for desktop

- [ ] **Step 2: Verify and commit**

```bash
git add frontend/src/pages/NetworkClinicsListPage.tsx
git commit -m "feat: adaptive card grid for NetworkClinicsListPage"
```

---

## Task 8: Edit/Detail Pages — Wider Forms

**Files:**
- Modify: `frontend/src/pages/ProfilePage.tsx`
- Modify: `frontend/src/pages/ContactEditPage.tsx`
- Modify: `frontend/src/pages/VisitCreatePage.tsx`
- Modify: `frontend/src/pages/VisitDetailsPage.tsx`
- Modify: `frontend/src/pages/NetworkClinicEditPage.tsx`
- Modify: `frontend/src/pages/admin/DeleteVisits.tsx`

These pages all have hardcoded narrow `maxWidth` values. The pattern is the same: widen on desktop, keep narrow on mobile.

- [ ] **Step 1: ProfilePage.tsx**

Line 117: Change `maxWidth: 600` to `maxWidth: 900`:

```tsx
// Before:
<Box sx={{ px: { xs: 2, md: 3 }, maxWidth: 600, mx: 'auto' }}>
// After:
<Box sx={{ px: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
```

- [ ] **Step 2: ContactEditPage.tsx**

Around line 348: Change `maxWidth: 800` to `maxWidth: 900`:

```tsx
// Before:
<Box sx={{ px: { xs: 2, md: 3 }, maxWidth: 800, mx: 'auto' }}>
// After:
<Box sx={{ px: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
```

Update FAB positioning — make mobile-only:

```tsx
{isMobile && (
  <Fab ...>
```

- [ ] **Step 3: VisitCreatePage.tsx**

Find the maxWidth constraint and update to 900. Update FAB to mobile-only.

- [ ] **Step 4: VisitDetailsPage.tsx**

The page already has responsive patterns with `isMobile`. Update any `maxWidth: 1000` to ensure it works well in the new wider layout. No further changes needed if it already adapts.

- [ ] **Step 5: NetworkClinicEditPage.tsx**

If using Container, ensure it's `maxWidth='md'` or wider. Verify forms display correctly at wider widths.

- [ ] **Step 6: DeleteVisits.tsx**

Line 51: Change `maxWidth: 600` to `maxWidth: 900`:

```tsx
// Before:
<Box sx={{ p: 3, maxWidth: 600, margin: 'auto' }}>
// After:
<Box sx={{ p: 3, maxWidth: 900, margin: 'auto' }}>
```

- [ ] **Step 7: Commit all edit pages**

```bash
git add frontend/src/pages/ProfilePage.tsx \
      frontend/src/pages/ContactEditPage.tsx \
      frontend/src/pages/VisitCreatePage.tsx \
      frontend/src/pages/VisitDetailsPage.tsx \
      frontend/src/pages/NetworkClinicEditPage.tsx \
      frontend/src/pages/admin/DeleteVisits.tsx
git commit -m "feat: widen form containers for desktop layout"
```

---

## Task 9: Admin & Platform Pages — Wider Content

**Files:**
- Modify: `frontend/src/pages/admin/UserManagementPage.tsx`
- Modify: `frontend/src/pages/admin/FieldMappingPage.tsx`
- Modify: `frontend/src/pages/admin/GlobalSettingsPage.tsx`
- Modify: `frontend/src/pages/platform/PlatformOrganizationsPage.tsx`

These pages benefit naturally from the wider layout since the 600px container constraint is removed in Layout.tsx. Verify each looks correct at desktop width.

- [ ] **Step 1: UserManagementPage.tsx**

Already table-based — should work well at wider widths. Add padding adjustment if needed:

```tsx
<Box sx={{ p: { xs: 2, md: 3 } }}>
```

- [ ] **Step 2: FieldMappingPage.tsx**

Same padding adjustment pattern.

- [ ] **Step 3: GlobalSettingsPage.tsx**

Add maxWidth to prevent form fields from stretching too wide:

```tsx
<Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
```

- [ ] **Step 4: PlatformOrganizationsPage.tsx**

Table-based — benefits from width naturally. Verify styling.

- [ ] **Step 5: Verify all admin pages at desktop width**

Check each admin page at 1200px+ width. Expected: content fills available space reasonably, tables stretch, forms are centered with 900px max.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/UserManagementPage.tsx \
      frontend/src/pages/admin/FieldMappingPage.tsx \
      frontend/src/pages/admin/GlobalSettingsPage.tsx \
      frontend/src/pages/platform/PlatformOrganizationsPage.tsx
git commit -m "feat: adjust admin and platform pages for desktop layout"
```

---

## Task 10: Final Verification & Cleanup

- [ ] **Step 1: Full desktop walkthrough**

Open app at 1400px width. Navigate through every route:
- `/visits` — card grid, sidebar active
- `/visits/new/*` — wider form
- `/visits/:id` — wider detail view
- `/companies` — card grid with 3 columns
- `/companies/:id/edit` — wider form
- `/contacts` — card grid
- `/contacts/:id` — wider edit form
- `/admin` — settings page
- `/admin/user-management` — table, wider
- `/admin/field-mappings` — wider
- `/admin/delete-visits` — wider form
- `/profile` — wider card layout

Verify: sidebar collapses/expands, state persists on page navigation, no content overlap.

- [ ] **Step 2: Full mobile walkthrough**

Shrink to 375px width. Same routes. Verify:
- Sidebar gone
- BottomNavigation present
- FAB buttons visible on list pages
- No horizontal scrolling
- Cards single-column

- [ ] **Step 3: Toggle sidebar at md breakpoint boundary**

Resize browser slowly across 900px. Verify smooth transition: sidebar appears/disappears, BottomNav toggles, no layout jump.

- [ ] **Step 4: Dark mode check**

Toggle dark mode in both desktop and mobile. Verify sidebar follows theme colors.

- [ ] **Step 5: Clean up mockup server references**

Remove any temporary files if created during development.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete desktop layout with collapsible sidebar and adaptive grid"
```
