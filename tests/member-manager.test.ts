import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/members/team-manager.tsx"), "utf8");

describe("gestionnaire de membres", () => {
  it("exige une confirmation avant le retrait et protège visuellement le propriétaire", () => {
    expect(source).toContain("setConfirmingRemoval(true)");
    expect(source).toContain("Confirmer le retrait");
    expect(source).toContain("!selected.is_owner");
  });

  it("n’invente pas de modification de rôle et explique la limite du contrat", () => {
    expect(source).toContain("Le rôle ne peut pas être modifié");
    expect(source).not.toContain('name="role"');
  });
});
