import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("frontière i18n compatible Cache Components", () => {
  it("conserve le RootLayout statique et isole les APIs de requête sous Suspense", () => {
    const rootLayout = source("src/app/layout.tsx");
    const boundary = source("src/components/i18n/locale-boundary.tsx");

    expect(rootLayout).toContain("<html");
    expect(rootLayout).toContain("lang=\"fr\"");
    expect(rootLayout).toContain("strategy=\"beforeInteractive\"");
    expect(rootLayout).toContain("suppressHydrationWarning");
    expect(rootLayout).toContain("<Suspense");
    expect(rootLayout).toContain("<LocaleBoundary>");
    expect(rootLayout).not.toContain("resolveRequestLocale");
    expect(boundary).toContain("resolveRequestLocale()");
  });
});
