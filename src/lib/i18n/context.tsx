"use client";
// Client Component: manages locale state with localStorage + cookie persistence

import { createContext, useCallback, useEffect, useState } from "react";
import type { Locale } from "./types";
import { DEFAULT_LOCALE } from "./types";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

interface LocaleProviderProps {
  children: React.ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const saved = localStorage.getItem("adlance-locale");
    if (saved === "vi" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("adlance-locale", l);
    document.cookie = `adlance-locale=${l};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {/* Sync localStorage → cookie before React hydrates to prevent locale flicker */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var l=localStorage.getItem('adlance-locale');if(l)document.cookie='adlance-locale='+l+';path=/;max-age=31536000;SameSite=Lax';}catch(e){}`,
        }}
      />
      {children}
    </LocaleContext.Provider>
  );
}
