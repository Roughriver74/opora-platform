# Desktop Layout Design Spec

**Date**: 2026-04-10
**Status**: Approved
**Mockup**: `docs/mockups/desktop-layout.html`

## Summary

Add a full desktop layout to the OPORA platform. Currently the UI is locked to a 600px mobile container even on desktop. The new layout introduces a collapsible sidebar, full-width content area with adaptive card grids, while preserving the existing mobile experience unchanged.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Layout approach | Hybrid — sidebar nav + card-based content (no tables) |
| Sidebar style | Collapsible: 220px expanded / 64px collapsed |
| Card grid | Adaptive: 1 col (mobile) → 2 col (md) → 3 col (lg+) |
| AppBar on desktop | Above content only; sidebar is full-height on the left |
| Mobile (< md) | Unchanged: AppBar + BottomNavigation + single column cards |

## Breakpoint Strategy

| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| `xs` | 0–599px | Mobile: current layout, BottomNav, 1-column cards |
| `sm` | 600–899px | Transitional: may still show BottomNav or sidebar depending on device |
| `md` | 900px+ | Desktop: sidebar + AppBar over content, 2-column card grid |
| `lg` | 1200px+ | 3-column card grid |
| `xl` | 1536px+ | Content maxWidth: 1400px, centered |

The `md` (900px) breakpoint is the primary mobile/desktop split.

## Layout Structure

### Desktop (>= md)

```
┌─────────────┬────────────────────────────────────────┐
│             │  AppBar (60px, right of sidebar)        │
│  Sidebar    │  ──────────────────────────────────────│
│  220px /    │                                        │
│  64px       │  Content (max-width: 1400px, centered) │
│  full       │  Adaptive card grid                    │
│  height     │                                        │
│             │                                        │
│  Logo top   │                                        │
│  Nav middle │                                        │
│  User bottom│                                        │
└─────────────┴────────────────────────────────────────┘
```

### Mobile (< md)

```
┌──────────────────────┐
│ AppBar (60px)        │
│──────────────────────│
│                      │
│ Content              │
│ Single-column cards  │
│                      │
│──────────────────────│
│ BottomNavigation     │
└──────────────────────┘
```

## Component Changes

### 1. New: `Sidebar` component

**File**: `frontend/src/components/Sidebar.tsx`

- Fixed left, full viewport height
- Two states: expanded (220px) / collapsed (64px)
- Collapse state persisted in localStorage
- Toggle button on the sidebar edge (circular, rotates on collapse)
- Sections:
  - **Header**: Logo ("ОПОРА" expanded, "О" collapsed)
  - **Navigation**: Same items as current BottomNavigation (Визиты, Компании, Контакты, Настройки) + admin items for admin users
  - **Footer**: User avatar + name/email (hidden when collapsed)
- Only rendered on desktop (>= md)

### 2. Modified: `Layout.tsx`

Current state:
- Outer Box with `maxWidth: 600px` — acts as mobile phone simulator
- BottomNavigation always visible
- AppBar absolute within the 600px container

Changes:
- On desktop (>= md):
  - Remove `maxWidth: 600px` constraint
  - Render `<Sidebar />` component
  - AppBar gets `margin-left` equal to sidebar width (transitions with sidebar)
  - Content area gets `margin-left` equal to sidebar width
  - Hide BottomNavigation
  - Hide back button in AppBar (sidebar handles navigation)
  - Show page title in AppBar
- On mobile (< md):
  - Keep everything as-is: 600px container, BottomNavigation, current AppBar

### 3. New: `SidebarContext`

**File**: `frontend/src/context/SidebarContext.tsx`

- Provides `isCollapsed` boolean and `toggleSidebar()` function
- Persists state to `localStorage` key `sidebar-collapsed`
- Used by Layout, Sidebar, and any component that needs sidebar width

### 4. Modified: List Pages — Adaptive Card Grid

Pages affected:
- `ClinicsListPage.tsx`
- `ContactsListPage.tsx`
- `NetworkClinicsListPage.tsx`
- `VisitsPage.tsx`

Changes:
- Wrap card lists in MUI `Grid` container with responsive columns:
  - `xs={12}` — 1 column
  - `md={6}` — 2 columns
  - `lg={4}` — 3 columns
- On desktop: replace FAB button with inline "Создать" button in toolbar
- Add toolbar row with search, filters, and action button (as shown in mockup)
- Pagination stays full-width below the grid

### 5. Modified: Edit/Detail Pages — Wider Forms

Pages affected:
- `ClinicEditPage.tsx`
- `ContactEditPage.tsx`
- `NetworkClinicEditPage.tsx`
- `VisitCreatePage.tsx`
- `VisitDetailsPage.tsx`
- `ProfilePage.tsx`

Changes:
- Remove hardcoded `maxWidth: 800` constraints on desktop
- Use `maxWidth: 900px` with `mx: 'auto'` for form content
- Form fields: use 2-column grid on desktop (`md={6}`), single column on mobile (`xs={12}`)

### 6. Modified: Admin Pages

Pages affected:
- `UserManagementPage.tsx`
- `FieldMappingPage.tsx`
- `GlobalSettingsPage.tsx`
- `DeleteVisits.tsx`
- `PlatformOrganizationsPage.tsx`

Changes:
- Same wider content treatment
- UserManagementPage already has a table — it benefits naturally from wider layout
- FieldMappingPage: wider form/table layout
- Settings pages: 2-column form layout on desktop

### 7. FAB Positioning

Current FABs are positioned relative to the 600px container:
```tsx
right: 'calc(50% - 280px)'
```

Changes:
- On desktop: hide FAB, show inline button in page toolbar instead
- On mobile: keep FAB with `right: 20px` positioning

### 8. Pages NOT affected

- `AuthPage.tsx` — standalone login page, no sidebar
- `RegisterPage.tsx` — standalone, no sidebar
- `InviteAcceptPage.tsx` — standalone, no sidebar
- `DoctorSelect.tsx` — modal/dialog component
- `LprCell.tsx` — table cell component
- `QuantityLoader.tsx` — utility component

## Theme Integration

- Sidebar uses existing theme tokens (`background.paper`, `divider`, `primary.main`, `text.primary/secondary`)
- Dark mode: sidebar background follows `background.paper` from theme
- Transition animation: `width 0.25s cubic-bezier(0.4, 0, 0.2, 1)` for sidebar, matching `margin-left` transition on main area

## State Management

- Sidebar collapse state: `SidebarContext` + localStorage
- No new API calls needed
- No backend changes

## Testing Considerations

- Verify sidebar toggle works and persists across page navigations
- Verify responsive breakpoints: resize browser from mobile to desktop
- Verify all navigation items work in sidebar (same routes as BottomNav)
- Verify admin-only items appear correctly in sidebar
- Verify dark mode works with sidebar
- Verify FAB hidden on desktop, inline button shown instead
