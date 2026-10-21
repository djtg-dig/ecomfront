"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { clearBusinessPermissionsCache } from "@/components/private/business-permissions-provider";
import { useLocale } from "@/components/i18n/locale-provider";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const { t } = useLocale();

  async function logout() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "x-csrf-protection": "1" },
      });
      if (response.ok || response.status === 503) {
        clearBusinessPermissionsCache();
        router.replace("/");
      }
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        className="nav-link min-h-11"
        disabled={pending}
        onClick={logout}
        type="button"
      >
        {pending ? t("navigation", "logoutPending") : t("navigation", "logout")}
      </button>
      {failed ? <span className="text-xs text-[var(--error)]" role="alert">La déconnexion a échoué.</span> : null}
    </span>
  );
}
