"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AuthenticationState = "loading" | "authenticated" | "unauthenticated" | "forbidden" | "unavailable";

type AuthenticationContextValue = {
  state: AuthenticationState;
  refresh: () => void;
  markAuthenticated: () => void;
  markUnauthenticated: () => void;
};

const AuthenticationContext = createContext<AuthenticationContextValue | null>(null);

/**
 * État client unique de la session BFF.
 *
 * Le cookie reste la source de vérité côté serveur. Cet état ne contient aucun
 * jeton : il évite seulement que des composants conservés par la navigation
 * cliente continuent d'afficher l'ancien compte après une déconnexion.
 */
export function AuthSessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<AuthenticationState>("loading");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "x-csrf-protection": "1" },
      cache: "no-store",
      signal: controller.signal,
    }).then((response) => {
      if (controller.signal.aborted) return;
      if (response.status === 204) return setState("authenticated");
      if (response.status === 401) return setState("unauthenticated");
      if (response.status === 403) return setState("forbidden");
      setState("unavailable");
    }).catch(() => {
      if (!controller.signal.aborted) setState("unavailable");
    });
    return () => controller.abort();
  }, [version]);

  const value = useMemo<AuthenticationContextValue>(() => ({
    state,
    refresh: () => { setState("loading"); setVersion((current) => current + 1); },
    markAuthenticated: () => setState("authenticated"),
    markUnauthenticated: () => setState("unauthenticated"),
  }), [state]);

  return <AuthenticationContext.Provider value={value}>{children}</AuthenticationContext.Provider>;
}

export function useAuthSession() {
  const value = useContext(AuthenticationContext);
  if (!value) throw new Error("useAuthSession must be used inside AuthSessionProvider.");
  return value;
}
