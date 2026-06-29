// Client Component: hook to access current locale and translation dictionary
"use client";

import { useContext } from "react";
import { LocaleContext } from "./context";
import { vi } from "./vi";
import { en } from "./en";
import type { Dictionary, Locale } from "./types";

const dictionaries: Record<Locale, Dictionary> = { vi, en };

export function useT() {
  const { locale, setLocale } = useContext(LocaleContext);
  return { t: dictionaries[locale], locale, setLocale };
}
