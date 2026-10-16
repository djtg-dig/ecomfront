import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/members/invitation-link.tsx"), "utf8");

describe("page publique du lien d’invitation", () => {
  it("traite l’absence de session comme un état, sans navigation automatique à cette étape", () => {
    expect(source).toContain('"authentication_required"');
    expect(source).toContain("Veuillez d'abord vous connecter à votre compte E-commerce. Après connexion, consultez vos notifications ou vos invitations reçues dans votre espace pour retrouver cette invitation et y répondre.");
    expect(source).toContain("window.location.assign(destination)");
    expect(source).toContain("Mes entreprises");
  });

  it("propose explicitement le changement de compte après un refus de destinataire", () => {
    expect(source).toContain('"recipient_mismatch"');
    expect(source).toContain("Se connecter avec un autre compte");
  });

  it("redirige vers une liste fraîche après acceptation sans fabriquer de permission", () => {
    expect(source).toContain("body.invitation?.status === \"ACCEPTED\"");
    expect(source).toContain("document navigation so a stale App Router cache cannot keep /invitation");
    expect(source).toContain("business_primary_category");
  });
});
