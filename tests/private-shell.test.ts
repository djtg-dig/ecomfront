import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("shell de l’espace privé", () => {
  it("garde le shell, la navigation Next et la déconnexion dans le layout privé", () => {
    const layout = source("src/app/(private)/layout.tsx");
    const shell = source("src/components/private/private-shell.tsx");

    expect(layout).toContain("<PrivateShell>");
    expect(layout).toContain("<PrivateSessionGuard>{children}</PrivateSessionGuard>");
    expect(layout).not.toContain("readEcommerceSession");
    expect(shell).toContain('import Link from "next/link"');
    expect(shell).toContain("usePathname");
    expect(shell).toContain("<LogoutButton />");
    expect(shell).toContain('aria-label="Navigation privée"');
    expect(shell).toContain('aria-current={isActive(pathname, item.href) ? "page" : undefined}');
    expect(shell).toContain("PrivateBusinessProvider");
    expect(shell).not.toContain("private-business-selector");
    expect(shell).not.toContain("<select");
    expect(shell).toContain('{ href: "/espace/parametres", label: "Paramètres" }');
    expect(shell).toContain("Entreprise active");
    expect(shell).toContain("Non sélectionnée");
    expect(shell).not.toContain("membres");
    expect(shell).toContain("permissions effectives par le backend");
    expect(shell).toContain("<SiteFooter />");
    expect(shell).toContain("site-container");
    expect(source("src/app/(private)/espace/loading.tsx")).not.toContain("min-h-screen");
  });

  it("n’affiche aucun module sans contrat de permissions effectives", () => {
    const dashboard = source("src/components/private/private-dashboard.tsx");

    expect(dashboard).toContain("ENTREPRISE ACTIVE");
    expect(dashboard).toContain("Permissions des modules indisponibles");
    expect(dashboard).toContain("Choisissez une entreprise");
    expect(dashboard).toContain("/espace/parametres");
    expect(dashboard).not.toContain("selectBusiness");
    expect(dashboard).not.toContain("<select");
    expect(dashboard).not.toContain("/membres");
  });

  it("restreint le changement volontaire aux paramètres avancés et redirige après succès", () => {
    const settings = source("src/components/private/private-settings.tsx");
    const settingsPage = source("src/app/(private)/espace/parametres/page.tsx");

    expect(settingsPage).toContain("<PrivateSettings />");
    expect(settings).toContain("Paramètres avancés");
    expect(settings).toContain("Membres et permissions");
    expect(settings).toContain("Changer d’entreprise");
    expect(settings).toContain("await selectBusiness(businessId)");
    expect(settings).toContain('router.replace("/espace")');
    expect(settings).toContain("selectionError");
    expect(settings).toContain("business.public_id === selectedBusinessId");
  });

  it("redirige après une déconnexion réussie sans rafraîchir le layout privé", () => {
    const logout = source("src/components/auth/logout-button.tsx");

    expect(logout).toContain('method: "POST"');
    expect(logout).toContain('headers: { "x-csrf-protection": "1" }');
    expect(logout).toContain('router.replace("/")');
    expect(logout).not.toContain("router.refresh()");
  });
});
