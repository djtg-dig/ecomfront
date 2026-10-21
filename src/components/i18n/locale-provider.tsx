"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { message, type MessageKey } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locale";

type LocaleContextValue = { locale: Locale; t: (section: MessageKey, key: string) => string; setVisitorLocale: (locale: Locale) => Promise<void> };
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children, initialLocale }: Readonly<{ children: ReactNode; initialLocale: Locale }>) {
  const [locale, setLocale] = useState(initialLocale);
  const router = useRouter();
  const setVisitorLocale = useCallback(async (nextLocale: Locale) => {
    const response = await fetch("/api/locale", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify({ locale: nextLocale }) });
    if (!response.ok) throw new Error("locale_update_failed");
    setLocale(nextLocale);
    router.refresh();
  }, [router]);
  useEffect(() => {
    // Le RootLayout reste statique pour Cache Components. Cette synchronisation
    // applique l'attribut exact une fois la frontière request-time hydratée.
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => ({ locale, t: (section: MessageKey, key: string) => message(locale, section, key), setVisitorLocale }), [locale, setVisitorLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
