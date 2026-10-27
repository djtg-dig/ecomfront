import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/purchases/purchase-manager.tsx"), "utf8");

describe("gestionnaire d’achats", () => {
  it("n’expose que les transitions disponibles et confirme la réception", () => {
    expect(source).toContain('actionName: "confirm" | "receive" | "cancel"');
    expect(source).toContain("Réceptionner cet achat");
    expect(source).not.toContain('action("approve")');
  });
  it("ne met jamais le stock à jour côté client", () => {
    expect(source).toContain("mouvements de stock Django");
    expect(source).not.toContain("available_quantity");
    expect(source).toContain("await loadDetail()");
  });
  it("contraint les quantités et coûts dans le formulaire de ligne", () => {
    expect(source).toContain('min="0.001"');
    expect(source).toContain('min="0"');
    expect(source).toContain('disabled={saving}');
  });
  it("stabilise les chargeurs et ignore les réponses obsolètes", () => {
    expect(source).toContain("const loadList = useCallback");
    expect(source).toContain("const loadDetail = useCallback");
    expect(source).toContain("const requestVersion = useRef(0)");
    expect(source).toContain("const isCurrent = () => requestVersion.current === version;");
    expect(source).toContain("[businessId, canViewPurchases, canViewSuppliers, router]");
    expect(source).toContain("[businessId, purchaseId, router]");
    expect(source).toContain("[canViewPurchases, loadDetail, loadList, purchaseId]");
    expect(source).not.toContain("canCreatePurchase, canViewPurchases, canViewSuppliers, loadDetail, loadList");
  });
  it("présente les achats en tableau desktop et en cartes mobiles sans modifier les contrats", () => {
    expect(source).toContain("function PurchaseListView");
    expect(source).toContain('hidden overflow-x-auto md:block');
    expect(source).toContain('grid gap-3 md:hidden');
    expect(source).toContain("Référence ou fournisseur");
    expect(source).toContain("Tous les statuts");
  });
  it("organise le détail autour des lignes, du récapitulatif et des transitions autorisées", () => {
    expect(source).toContain("function PurchaseDetailView");
    expect(source).toContain("Produits achetés");
    expect(source).toContain("Récapitulatif financier");
    expect(source).toContain('onAction("receive")');
  });
});
