import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../src/components/public/product-page.tsx", import.meta.url), "utf8");
const badge = readFileSync(new URL("../src/components/public/company-verification-badge.tsx", import.meta.url), "utf8");
const contract = readFileSync(new URL("../src/lib/api/public-catalog.ts", import.meta.url), "utf8");

describe("vérification de l’entreprise sur le détail produit", () => {
  it("utilise le statut fourni par le contrat public", () => {
    expect(contract).toContain("business_is_verified?: boolean | null");
    expect(page).toContain("<CompanyVerificationBadge isVerified={product.business_is_verified} />");
  });

  it("gère les trois états sans transformer une donnée absente en vérification", () => {
    expect(badge).toContain("isVerified === undefined || isVerified === null");
    expect(badge).toContain("Entreprise vérifiée");
    expect(badge).toContain("Entreprise non vérifiée");
    expect(badge).toContain("role=\"img\"");
  });
});
