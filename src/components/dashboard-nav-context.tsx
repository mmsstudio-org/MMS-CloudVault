"use client";

import * as React from "react";

interface DashboardNavContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const DashboardNavContext = React.createContext<DashboardNavContextType | undefined>(
  undefined
);

export function DashboardNavProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const toggleSidebar = React.useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = React.useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <DashboardNavContext.Provider
      value={{ sidebarOpen, setSidebarOpen, toggleSidebar, closeSidebar }}
    >
      {children}
    </DashboardNavContext.Provider>
  );
}

export function useDashboardNav() {
  const context = React.useContext(DashboardNavContext);
  if (!context) {
    throw new Error("useDashboardNav must be used within a DashboardNavProvider");
  }
  return context;
}
