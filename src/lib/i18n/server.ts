import { cache } from "react";
import { cookies } from "next/headers";
import { vi } from "./vi";
import { en } from "./en";
import type { Dictionary, Locale } from "./types";

export const getServerTranslations = cache(async (): Promise<Dictionary> => {
  const store = await cookies();
  const raw = store.get("adlance-locale")?.value;
  const locale: Locale = raw === "en" || raw === "vi" ? raw : "vi";
  return locale === "en" ? en : vi;
});
