import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("navigation publique responsive", () => {
  it("réserve le hamburger aux écrans sous le breakpoint desktop", () => {
    const navigation = source("src/components/public/public-navigation.tsx");

    expect(navigation).toContain('className="public-mobile-menu-toggle button button-outline min-h-11 min-w-11 px-3 lg:hidden"');
    expect(navigation).toContain('className="hidden min-w-0 shrink-0 lg:block"');
    expect(navigation).toContain('aria-controls="public-mobile-navigation"');
    expect(navigation).toContain("aria-expanded={open}");
    expect(source("src/app/globals.css")).toMatch(/@media \(min-width: 1024px\)\s*\{\s*\.public-mobile-menu-toggle\s*\{\s*display: none;/);
  });

  it("conserve une grille d’en-tête réductible pour les largeurs intermédiaires", () => {
    const header = source("src/components/public/public-header.tsx");
    const styles = source("src/app/globals.css");

    expect(header).toContain("lg:grid-cols-[auto_minmax(0,1fr)_auto]");
    expect(header).toContain("min-w-0 w-full");
    expect(styles).toMatch(/\.marketplace-search-input\s*\{[^}]*min-width: 0;/);
  });
});
