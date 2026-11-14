"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
  const refreshController = useRef<AbortController | null>(null);
  const refreshSequence = useRef(0);
  const signedOut = useRef(false);

  const markUnauthenticated = useCallback(() => {
    signedOut.current = true;
    refreshSequence.current += 1;
    refreshController.current?.abort();
    setState("unauthenticated");
  }, []);
  const markAuthenticated = useCallback(() => {
    signedOut.current = false;
    setState("authenticated");
  }, []);
  const refresh = useCallback(() => {
    if (signedOut.current) return;
    setState("loading");
    setVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    if (signedOut.current) return;
    const controller = new AbortController();
    const sequence = ++refreshSequence.current;
    refreshController.current = controller;
    void fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "x-csrf-protection": "1" },
      cache: "no-store",
      signal: controller.signal,
    }).then((response) => {
      if (controller.signal.aborted || signedOut.current || sequence !== refreshSequence.current) return;
      if (response.status === 204) return setState("authenticated");
      if (response.status === 401) return setState("unauthenticated");
      if (response.status === 403) return setState("forbidden");
      setState("unavailable");
    }).catch(() => {
      if (!controller.signal.aborted && !signedOut.current && sequence === refreshSequence.current) setState("unavailable");
    }).finally(() => {
      if (refreshController.current === controller) refreshController.current = null;
    });
    return () => controller.abort();
  }, [version]);

  const value = useMemo<AuthenticationContextValue>(() => ({
    state,
    refresh,
    markAuthenticated,
    markUnauthenticated,
  }), [markAuthenticated, markUnauthenticated, refresh, state]);

  return <AuthenticationContext.Provider value={value}>{children}</AuthenticationContext.Provider>;
}

export function useAuthSession() {
  const value = useContext(AuthenticationContext);
  if (!value) throw new Error("useAuthSession must be used inside AuthSessionProvider.");
  return value;
}
