"use client";
// Client Component: manages global app state for brand selection (persisted to localStorage)

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const SELECTED_BRAND_STORAGE_KEY = "selected-brand-id";

interface AppContextValue {
  selectedBrandId: string | null;
  setSelectedBrandId: (id: string | null) => void;
  /** True once the persisted brand has been read from localStorage on the client. */
  brandHydrated: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Start null so server and first client render match (no hydration mismatch).
  const [selectedBrandId, setSelectedBrandIdState] = useState<string | null>(null);
  const [brandHydrated, setBrandHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SELECTED_BRAND_STORAGE_KEY);
      if (stored) setSelectedBrandIdState(stored);
    } catch {
      // ignore storage errors (privacy mode, disabled storage)
    }
    setBrandHydrated(true);
  }, []);

  const setSelectedBrandId = useCallback((id: string | null) => {
    setSelectedBrandIdState(id);
    try {
      if (id) localStorage.setItem(SELECTED_BRAND_STORAGE_KEY, id);
      else localStorage.removeItem(SELECTED_BRAND_STORAGE_KEY);
    } catch {
      // ignore storage quota / privacy errors
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        selectedBrandId,
        setSelectedBrandId,
        brandHydrated,
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
