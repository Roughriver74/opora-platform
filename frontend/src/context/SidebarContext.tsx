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
