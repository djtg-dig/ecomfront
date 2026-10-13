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

  it("utilise des modales et n’invente pas de modification de rôle", () => {
    expect(source).toContain('<Modal onClose={() => setInviteOpen(false)}');
    expect(source).toContain("Permissions initiales");
    expect(source).not.toContain('name="role"');
  });

  it("conditionne les actions de gestion à MANAGE_MEMBERS", () => {
    expect(source).toContain('includes("MANAGE_MEMBERS")');
    expect(source).toContain("canManage ?");
    expect(source).toContain("if (pending) return");
  });
});
