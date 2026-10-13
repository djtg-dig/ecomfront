import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("layouts et pied de page", () => {
  it("partage un footer unique entre les espaces public et privé", () => {
    const footer = source("src/components/layout/site-footer.tsx");
    const publicLayout = source("src/app/(public)/layout.tsx");
    const privateShell = source("src/components/private/private-shell.tsx");

    expect(footer).toContain("new Date().getFullYear()");
    expect(footer).toContain("Gérez vos entreprises");
    expect(footer).toContain('className="footer-link"');
    expect(footer).toContain('href: "/fonctionnalites"');
    expect(footer).toContain('href: "/contact"');
    expect(publicLayout).toContain("<SiteFooter />");
    expect(privateShell).toContain("<SiteFooter />");
    expect(source("src/app/(public)/page.tsx")).not.toContain("<PublicHeader");
    expect(source("src/app/(public)/contact/page.tsx")).not.toContain("<PublicHeader");
  });

  it("utilise un conteneur large et responsive sans élargir le formulaire de connexion", () => {
    const styles = source("src/app/globals.css");
    const login = source("src/app/(auth)/connexion/page.tsx");

    expect(styles).toContain(".site-container");
    expect(styles).toContain("max-width: 1800px");
    expect(styles).toContain("box-sizing: border-box");
    expect(styles).toContain("padding-inline: 1rem");
    expect(styles).toContain("padding-inline: 1.5rem");
    expect(styles).toContain("padding-inline: 2.5rem");
    expect(styles).toContain("padding-inline: 3rem");
    expect(styles).toContain("background: var(--brand)");
    expect(login).toContain("max-w-md");
  });

  it("aligne les en-têtes public et privé sur le conteneur partagé", () => {
    const publicHeader = source("src/components/public/public-header.tsx");
    const privateShell = source("src/components/private/private-shell.tsx");

    expect(publicHeader).toContain('className="site-container flex min-h-16');
    expect(publicHeader).not.toContain("max-w-6xl");
    expect(privateShell).toContain('className="site-container flex flex-wrap items-center justify-between');
    expect(privateShell).toContain("Entreprise active");
    expect(privateShell).toContain("order-3 flex w-full");
  });

  it("place l’attente des paramètres privés dynamiques derrière Suspense", () => {
    const pages = [
      "page.tsx",
      "achats/page.tsx",
      "achats/[purchaseId]/page.tsx",
      "finance/page.tsx",
      "membres/page.tsx",
      "produits/page.tsx",
      "produits/[productId]/page.tsx",
      "stocks/page.tsx",
      "stocks/[inventoryId]/page.tsx",
      "ventes/page.tsx",
      "ventes/[saleId]/page.tsx",
    ];
    const base = "src/app/(private)/espace/entreprises/[businessId]/";

    for (const page of pages) {
      const content = source(`${base}${page}`);
      expect(content).toContain("<Suspense fallback={<PrivatePageFallback />}");
      expect(content).toContain("await params");
      expect(content).not.toContain("export default async function");
    }
  });
});
