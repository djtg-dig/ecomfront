"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Business = { public_id: string; name: string; primary_currency: string; status: string };

type BusinessNameState = {
  business: Business | null;
  error: string | null;
};

const BusinessNameContext = createContext<BusinessNameState | null>(null);

async function detail(response: Response) {
  try { return (await response.json() as { detail?: string }).detail ?? "Le service E-commerce est indisponible."; }
  catch { return "Le service E-commerce est indisponible."; }
}

export function BusinessNameProvider({ businessId, children }: Readonly<{ businessId: string; children: ReactNode }>) {
  const router = useRouter();
  const [state, setState] = useState<BusinessNameState>({ business: null, error: null });

  useEffect(() => {
    let active = true;
    setState({ business: null, error: null });
    void fetch(`/api/private/businesses/${businessId}`, { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) throw new Error(await detail(response));
      if (active) setState({ business: (await response.json() as { business: Business }).business, error: null });
    }).catch((reason: unknown) => {
      if (active) setState({ business: null, error: reason instanceof Error ? reason.message : "Le service E-commerce est indisponible." });
    });
    return () => { active = false; };
  }, [businessId, router]);

  return <BusinessNameContext.Provider value={state}>{children}</BusinessNameContext.Provider>;
}

export function useBusinessNameState() {
  return useContext(BusinessNameContext);
}
