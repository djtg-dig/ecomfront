import type { ReactNode } from "react";

import { LocaleProvider } from "@/components/i18n/locale-provider";
import { resolveRequestLocale } from "@/lib/i18n/server-locale";

/**
 * Frontière request-time : avec Cache Components, cookies() et headers() ne
 * peuvent être lus qu'en dessous du Suspense déclaré par le RootLayout.
 */
export async function LocaleBoundary({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await resolveRequestLocale();
  return <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>;
}
