import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/members/invitation-link.tsx"), "utf8");

describe("page publique du lien d’invitation", () => {
  it("traite l’absence de session comme un état, sans navigation automatique", () => {
    expect(source).toContain('"authentication_required"');
    expect(source).toContain("Veuillez vous connecter avec votre compte Carri Account pour consulter cette invitation et y répondre.");
    expect(source).not.toContain("useRouter");
    expect(source).not.toContain("router.replace");
    expect(source).not.toContain("router.refresh");
  });

  it("propose explicitement le changement de compte après un refus de destinataire", () => {
    expect(source).toContain('"recipient_mismatch"');
    expect(source).toContain("Se connecter avec un autre compte");
  });
});
