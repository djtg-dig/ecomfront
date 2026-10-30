import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("variantes du pied de page", () => {
  it("distingue explicitement les footers public et privé complets", () => {
    const footer = source("src/components/layout/site-footer.tsx");
    const publicLayout = source("src/app/(public)/layout.tsx");
    const privateShell = source("src/components/private/private-shell.tsx");

    expect(footer).toContain('variant: "public" | "private"');
    expect(footer).toContain('variant === "private" ? "site-footer-private" : "site-footer-public"');
    expect(footer).toContain("site-footer-private");
    expect(footer).toContain("site-footer-public");
    expect(footer).toContain("Nos plateformes");
    expect(footer).toContain("Carri Business");
    expect(footer).toContain("Kisinet");
    expect(footer).toContain("Conditions générales");
    expect(footer).toContain("Confidentialité");
    expect(footer).toContain("Assistance");
    expect(footer).toContain('href: "/cookies"');
    expect(footer).toContain("Tous droits réservés.");
    expect(publicLayout).toContain('<SiteFooter variant="public" />');
    expect(privateShell).toContain('<SiteFooter variant="private" />');
  });

  it("utilise quatre colonnes desktop et se replie sans débordement", () => {
    const footer = source("src/components/layout/site-footer.tsx");
    const styles = source("src/app/globals.css");

    expect(footer).toContain("sm:grid-cols-2");
    expect(footer).toContain("lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]");
    expect(footer).toContain('border-t border-[var(--line)]');
    expect(footer).toContain("brand-mark");
    expect(styles).toMatch(/\.site-footer\s*\{[\s\S]*border-top: 1px solid var\(--line\);[\s\S]*box-shadow: inset 0 4px 0 var\(--brand\);/);
  });

  it("garde le footer dans le flux après une zone centrale extensible", () => {
    const publicLayout = source("src/app/(public)/layout.tsx");
    const privateShell = source("src/components/private/private-shell.tsx");
    const homeContent = source("src/components/public/public-page-content.tsx");

    expect(publicLayout).toContain('className="flex flex-1 flex-col"');
    expect(privateShell).toContain('className="site-container flex flex-1 flex-col gap-6 py-6 md:flex-row"');
    expect(homeContent).toContain('<MarketplaceHome initialListing={listing} initialError={error} />');
    expect(homeContent).not.toContain("min-h-[calc(100vh-9rem)]");
    expect(publicLayout).not.toContain("fixed");
    expect(privateShell).not.toContain("fixed");
  });
});
