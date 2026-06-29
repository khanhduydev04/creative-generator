"use client";
// Client Component: manages global app state for brand selection

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface AppContextValue {
  selectedBrandId: string | null;
  setSelectedBrandId: (id: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  return (
    <AppContext.Provider
      value={{
        selectedBrandId,
        setSelectedBrandId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
