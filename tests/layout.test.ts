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
    expect(styles).toContain("padding-inline: 1rem");
    expect(login).toContain("max-w-md");
  });
});
