import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("frontières Cache Components du catalogue", () => {
  const publicCatalogPages = [
    "src/app/(public)/page.tsx",
    "src/app/(public)/categories/[slug]/page.tsx",
    "src/app/(public)/boutiques/[businessId]/page.tsx",
    "src/app/(public)/produits/[productId]/page.tsx",
    "src/app/(public)/recherche/page.tsx",
  ];

  it.each(publicCatalogPages)("attend la requête avant un appel HMAC dans %s", (path) => {
    const page = source(path);
    expect(page).toContain('import { connection } from "next/server"');
    expect(page).toContain("await connection();");
    expect(page).toContain("<Suspense fallback={<PublicCatalogFallback />}");
  });

  it("suspend la lecture de la référence du panier", () => {
    const page = source("src/app/(private)/compte/paniers/[reference]/page.tsx");
    expect(page).toContain("<Suspense fallback={<PrivatePageFallback />}");
    expect(page).toContain("async function AccountCartDetailContent");
    expect(page).toContain("const { reference } = await params;");
  });
});
