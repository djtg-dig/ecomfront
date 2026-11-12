"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { useAuthSession } from "@/components/auth/auth-session-provider";

/** Verifies the encrypted BFF session once; a cookie alone is never treated as proof. */
export function HomeAuthenticationAction() {
  const { state } = useAuthSession();
  const { t } = useLocale();

  if (state === "loading") {
    return <span aria-busy="true" className="button button-primary ml-0 mt-3 cursor-wait opacity-70 sm:ml-3">{t("home", "checking")}</span>;
  }
  if (state === "authenticated") {
    return <Link className="button button-primary ml-0 mt-3 sm:ml-3" href="/espace">{t("home", "openWorkspace")}</Link>;
  }
  if (state === "unauthenticated") {
    return <a className="button button-primary ml-0 mt-3 sm:ml-3" href="/api/auth/carri/login">{t("home", "signInCarri")}</a>;
  }
  return <span className="ml-0 mt-3 inline-block text-sm text-[var(--muted)]" role="status">{t("home", "unavailable")}</span>;
}
