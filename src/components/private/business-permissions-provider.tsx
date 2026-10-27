"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export const BUSINESS_PERMISSIONS_FRESHNESS_MS = 30_000;

type CachedPermissions = {
  permissions: string[];
  expiresAt: number;
};

const runtime = globalThis as typeof globalThis & {
  __ecommerceBusinessPermissions?: {
    activeUserId: string | null;
    cache: Map<string, CachedPermissions>;
    inFlight: Map<string, Promise<{ user_id: string; permissions: string[] }>>;
  };
};

const cacheState = (runtime.__ecommerceBusinessPermissions ??= {
  activeUserId: null,
  cache: new Map<string, CachedPermissions>(),
  inFlight: new Map<string, Promise<{ user_id: string; permissions: string[] }>>(),
});

type PermissionState = {
  permissions: string[] | null;
  status: "loading" | "forbidden" | "unavailable" | "ready";
  refresh: (force?: boolean) => Promise<void>;
};

type ProviderState = Omit<PermissionState, "refresh"> & { businessId: string };

const BusinessPermissionsContext = createContext<PermissionState | null>(null);

function cacheKey(userId: string, businessId: string) {
  return `${userId}:${businessId}`;
}

function cachedPermissions(businessId: string) {
  const userId = cacheState.activeUserId;
  if (!userId) return null;
  const key = cacheKey(userId, businessId);
  const cached = cacheState.cache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    cacheState.cache.delete(key);
    return null;
  }
  return cached.permissions;
}

function initialState(businessId: string): ProviderState {
  const permissions = cachedPermissions(businessId);
  return permissions ? { businessId, permissions, status: "ready" } : { businessId, permissions: null, status: "loading" };
}

export function clearBusinessPermissionsCache() {
  cacheState.activeUserId = null;
  cacheState.cache.clear();
  cacheState.inFlight.clear();
}

function invalidateBusinessPermissionsCache(businessId: string) {
  if (cacheState.activeUserId) cacheState.cache.delete(cacheKey(cacheState.activeUserId, businessId));
}

export function BusinessPermissionsProvider({ businessId, children }: Readonly<{ businessId: string; children: ReactNode }>) {
  const router = useRouter();
  // Read the short-lived tenant cache during render. This prevents every
  // route change under an already-open business from flashing a loading state.
  const [state, setState] = useState<ProviderState>(() => initialState(businessId));

  const refresh = useCallback(async (force = false) => {
    const cached = force ? null : cachedPermissions(businessId);
    if (cached) {
      setState({ businessId, permissions: cached, status: "ready" });
      return;
    }

    setState({ businessId, permissions: null, status: "loading" });
    const inFlight = cacheState.inFlight.get(businessId) ?? fetch(`/api/private/businesses/${businessId}/my-permissions`, {
      credentials: "same-origin",
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) {
        const error = new Error(String(response.status));
        error.name = "BusinessPermissionsResponseError";
        throw error;
      }
      return response.json() as Promise<{ user_id: string; permissions: string[] }>;
    });
    cacheState.inFlight.set(businessId, inFlight);

    try {
      const data = await inFlight;
      if (cacheState.activeUserId && cacheState.activeUserId !== data.user_id) clearBusinessPermissionsCache();
      cacheState.activeUserId = data.user_id;
      cacheState.cache.set(cacheKey(data.user_id, businessId), {
        permissions: data.permissions,
        expiresAt: Date.now() + BUSINESS_PERMISSIONS_FRESHNESS_MS,
      });
      setState({ businessId, permissions: data.permissions, status: "ready" });
    } catch (error) {
      const status = error instanceof Error && error.name === "BusinessPermissionsResponseError" ? Number(error.message) : 0;
      if (status === 401) {
        clearBusinessPermissionsCache();
        router.replace("/connexion?erreur=session_expired");
      }
      if (status === 403) invalidateBusinessPermissionsCache(businessId);
      setState({ businessId, permissions: null, status: status === 401 || status === 403 ? "forbidden" : "unavailable" });
    } finally {
      if (cacheState.inFlight.get(businessId) === inFlight) cacheState.inFlight.delete(businessId);
    }
  }, [businessId, router]);

  useEffect(() => {
    // Le cache est lu par refresh : la valeur n'est pas dupliquée dans l'état local.
    startTransition(() => { void refresh(); });
    const interval = window.setInterval(() => { void refresh(true); }, BUSINESS_PERMISSIONS_FRESHNESS_MS);
    return () => window.clearInterval(interval);
  }, [businessId, refresh]);

  const visibleState = state.businessId === businessId
    ? state
    : { businessId, permissions: null, status: "loading" as const };
  return <BusinessPermissionsContext.Provider value={{ ...visibleState, refresh }}>{children}</BusinessPermissionsContext.Provider>;
}

export function useBusinessPermissionsState() {
  return useContext(BusinessPermissionsContext);
}
