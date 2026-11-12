import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("état d’authentification client", () => {
  it("centralise les états BFF sans exposer les jetons", () => {
    const provider = source("src/components/auth/auth-session-provider.tsx");
    expect(provider).toContain('"loading" | "authenticated" | "unauthenticated"');
    expect(provider).toContain('fetch("/api/auth/refresh"');
    expect(provider).toContain('cache: "no-store"');
    expect(provider).toContain("markUnauthenticated");
    expect(provider).not.toContain("accessToken");
  });

  it("efface immédiatement l’état connecté et le profil lors du logout ou d’un 401", () => {
    const logout = source("src/components/auth/logout-button.tsx");
    const profile = source("src/components/auth/authenticated-profile.tsx");
    const navigation = source("src/components/public/public-navigation.tsx");
    expect(logout).toContain("markUnauthenticated();");
    expect(logout).toContain('router.replace("/")');
    expect(profile).toContain('response.status === 401');
    expect(profile).toContain("setProfile(null)");
    expect(navigation).toContain('state === "authenticated"');
    expect(navigation).toContain("authenticated ?");
  });

  it("protège à nouveau les routes privées après une session supprimée", () => {
    const guard = source("src/components/auth/private-session-guard.tsx");
    expect(guard).toContain("useAuthSession");
    expect(guard).toContain('state === "unauthenticated"');
    expect(guard).toContain("clearBusinessPermissionsCache");
  });
});
