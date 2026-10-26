import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/sales/sale-manager.tsx"), "utf8");

describe("stabilité de la fiche vente", () => {
  it("ne lie pas le rechargement du détail à l’identité instable du tableau de permissions", () => {
    expect(source).toContain("const canViewCommercial = Boolean");
    expect(source).toContain("const loadDetail = useCallback");
    expect(source).toContain("const loadList = useCallback");
    expect(source).toContain("[businessId, locale, router, saleId]");
    expect(source).toContain("[canViewCommercial, loadDetail, loadList, saleId]");
    expect(source).toContain("Promise.resolve().then(() => { if (saleId) return loadDetail(); void loadList(); })");
    expect(source).not.toContain("[canViewCommercial, loadDetail, permissions, saleId]");
  });

  it("conserve la fiche et les lignes pendant une actualisation locale", () => {
    const detailStart = source.indexOf("const loadDetail = useCallback");
    const detailEnd = source.indexOf("async function loadList");
    const detailLoader = source.slice(detailStart, detailEnd);
    expect(detailLoader).not.toContain("setSale(null)");
    expect(detailLoader).not.toContain("setLines(null)");
    expect(detailLoader).toContain("setError(null)");
  });

  it("conserve le focus des modales sans faire défiler la page", () => {
    const modal = readFileSync(resolve(process.cwd(), "src/components/ui/modal.tsx"), "utf8");
    expect(modal).toContain("focus({ preventScroll: true })");
    expect(modal).not.toContain("scrollIntoView");
    expect(modal).not.toContain("scrollTo(");
  });
});
