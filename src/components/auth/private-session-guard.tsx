"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PrivateSessionGuard({ children }: Readonly<{ children: ReactNode }>) {
  const [status, setStatus] = useState<"checking" | "ready" | "unavailable">("checking");
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "x-csrf-protection": "1" },
      signal: controller.signal,
    }).then((response) => {
      if (response.status === 401) {
        router.replace("/connexion?erreur=session_expired");
        return;
      }
      setStatus(response.ok ? "ready" : "unavailable");
    }).catch(() => {
      if (!controller.signal.aborted) setStatus("unavailable");
    });

    return () => controller.abort();
  }, [router]);

  if (status === "unavailable") {
    return (
      <div className="grid min-h-64 place-items-center p-6">
        <section className="content-panel w-full max-w-md p-8" role="alert">
          <h1 className="text-lg font-semibold text-[var(--brand-secondary)]">Espace temporairement indisponible</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            La session n’a pas pu être vérifiée. Réessayez dans un instant.
          </p>
          <button className="button button-primary mt-6" onClick={() => router.refresh()} type="button">
            Réessayer
          </button>
        </section>
      </div>
    );
  }

  if (status === "checking") {
    return (
      <div aria-busy="true" className="grid min-h-64 place-items-center p-6">
        <p className="text-sm text-[var(--muted)]">Vérification de la session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
