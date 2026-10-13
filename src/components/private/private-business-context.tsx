"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type PrivateBusiness = {
  public_id: string;
  name: string;
  status: string;
  primary_currency: string;
};

type Overview = {
  identity: { id: string; carri_subject: string };
  businesses: PrivateBusiness[];
  selectedBusinessId: string | null;
};

export type PrivateBusinessState =
  | { kind: "loading" }
  | { kind: "ready"; overview: Overview }
  | { kind: "error"; status: 403 | 503; detail: string };

type PrivateBusinessContextValue = {
  state: PrivateBusinessState;
  selecting: boolean;
  selectionError: string | null;
  reload: () => Promise<void>;
  selectBusiness: (businessId: string) => Promise<boolean>;
};

const PrivateBusinessContext = createContext<PrivateBusinessContextValue | null>(null);

async function apiError(response: Response): Promise<{ detail?: string }> {
  try {
    return await response.json() as { detail?: string };
  } catch {
    return {};
  }
}

export function PrivateBusinessProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [state, setState] = useState<PrivateBusinessState>({ kind: "loading" });
  const [selecting, setSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setState({ kind: "loading" });
    setSelectionError(null);
    try {
      const response = await fetch("/api/private/overview", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) {
        router.replace("/connexion?erreur=session_expired");
        return;
      }
      if (!response.ok) {
        const error = await apiError(response);
        setState({
          kind: "error",
          status: response.status === 403 ? 403 : 503,
          detail: error.detail ?? "Le service E-commerce est temporairement indisponible.",
        });
        return;
      }
      setState({ kind: "ready", overview: await response.json() as Overview });
    } catch {
      setState({ kind: "error", status: 503, detail: "Le service E-commerce est temporairement indisponible." });
    }
  }, [router]);

  useEffect(() => { void reload(); }, [reload]);

  const selectBusiness = useCallback(async (businessId: string) => {
    if (state.kind !== "ready" || !businessId) return false;
    if (businessId === state.overview.selectedBusinessId) return true;
    setSelecting(true);
    setSelectionError(null);
    try {
      const response = await fetch("/api/private/business-selection", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "x-csrf-protection": "1" },
        body: JSON.stringify({ businessId }),
      });
      if (response.status === 401) {
        router.replace("/connexion?erreur=session_expired");
        return false;
      }
      if (!response.ok) {
        const error = await apiError(response);
        setSelectionError(error.detail ?? "La sélection n’a pas pu être enregistrée.");
        return false;
      }
      setState((current) => current.kind === "ready"
        ? { kind: "ready", overview: { ...current.overview, selectedBusinessId: businessId } }
        : current);
      return true;
    } catch {
      setSelectionError("La sélection n’a pas pu être enregistrée.");
      return false;
    } finally {
      setSelecting(false);
    }
  }, [router, state]);

  const value = useMemo(() => ({ state, selecting, selectionError, reload, selectBusiness }), [reload, selectBusiness, selecting, selectionError, state]);
  return <PrivateBusinessContext.Provider value={value}>{children}</PrivateBusinessContext.Provider>;
}

export function usePrivateBusiness() {
  const value = useContext(PrivateBusinessContext);
  if (!value) throw new Error("usePrivateBusiness doit être utilisé dans PrivateBusinessProvider.");
  return value;
}
