"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { clearBusinessPermissionsCache } from "@/components/private/business-permissions-provider";
import { useLocale } from "@/components/i18n/locale-provider";
import { useAuthSession } from "@/components/auth/auth-session-provider";

export function PrivateSessionGuard({ children }: Readonly<{ children: ReactNode }>) {
  const { state, refresh } = useAuthSession();
  const { t } = useLocale();

  useEffect(() => {
    if (state === "unauthenticated") clearBusinessPermissionsCache();
  }, [state]);

  const reconnect = () => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/connexion?erreur=session_expired&retour=${encodeURIComponent(returnTo)}`);
  };

  if (state === "unauthenticated" || state === "forbidden") {
    const isExpired = state === "unauthenticated";
    return (
      <div className="grid min-h-64 place-items-center p-6">
        <section className="content-panel w-full max-w-md p-8" role="alert">
          <h1 className="text-lg font-semibold text-[var(--brand-secondary)]">{t("feedback", isExpired ? "sessionExpiredTitle" : "privateForbiddenTitle")}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t("feedback", isExpired ? "sessionExpiredDescription" : "privateForbiddenDescription")}</p>
          {isExpired ? <button className="button button-primary mt-6" onClick={reconnect} type="button">{t("feedback", "reconnect")}</button> : null}
        </section>
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <div className="grid min-h-64 place-items-center p-6">
        <section className="content-panel w-full max-w-md p-8" role="alert">
          <h1 className="text-lg font-semibold text-[var(--brand-secondary)]">{t("feedback", "privateUnavailableTitle")}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {t("feedback", "privateUnavailableDescription")}
          </p>
          <button className="button button-primary mt-6" onClick={refresh} type="button">
            {t("feedback", "retry")}
          </button>
        </section>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <>
        {/* Keep the route segment mounted for Next's Instant Navigation validation.
            It remains visually and semantically hidden until the session refresh succeeds. */}
        <div aria-hidden="true" className="hidden">{children}</div>
        <div aria-busy="true" className="grid min-h-64 place-items-center p-6">
          <p className="text-sm text-[var(--muted)]">{t("feedback", "sessionChecking")}</p>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
