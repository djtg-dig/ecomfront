"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

type SessionState = "checking" | "authenticated" | "anonymous" | "unavailable";

/** Verifies the encrypted BFF session once; a cookie alone is never treated as proof. */
export function HomeAuthenticationAction() {
  const [state, setState] = useState<SessionState>("checking");
  const { t } = useLocale();

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "x-csrf-protection": "1" },
      signal: controller.signal,
    }).then((response) => {
      if (controller.signal.aborted) return;
      if (response.status === 204) {
        setState("authenticated");
      } else if (response.status === 401) {
        setState("anonymous");
      } else {
        setState("unavailable");
      }
    }).catch(() => {
      if (!controller.signal.aborted) setState("unavailable");
    });

    return () => controller.abort();
  }, []);

  if (state === "checking") {
    return <span aria-busy="true" className="button button-primary ml-0 mt-3 cursor-wait opacity-70 sm:ml-3">{t("home", "checking")}</span>;
  }
  if (state === "authenticated") {
    return <Link className="button button-primary ml-0 mt-3 sm:ml-3" href="/espace">{t("home", "openWorkspace")}</Link>;
  }
  if (state === "anonymous") {
    return <a className="button button-primary ml-0 mt-3 sm:ml-3" href="/api/auth/carri/login">{t("home", "signInCarri")}</a>;
  }
  return <span className="ml-0 mt-3 inline-block text-sm text-[var(--muted)]" role="status">{t("home", "unavailable")}</span>;
}
