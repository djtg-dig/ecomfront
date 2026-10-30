import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { groupMemberPermissions } from "@/components/members/member-permission-groups";
import { localizedPermissionCatalog, normalizeMessagingPermissions, updatePermissionSelection } from "@/lib/permissions/catalog";

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

  it("conditionne chaque action à sa permission atomique", () => {
    expect(source).toContain('includes("MEMBER_SUSPEND")');
    expect(source).toContain('includes("MEMBER_REMOVE")');
    expect(source).toContain('includes("MEMBER_PERMISSION_GRANT")');
    expect(source).toContain('includes("INVITATION_CREATE")');
    expect(source).toContain("if (pending) return");
  });

  it("regroupe et trie les permissions par leur libellé français sans muter les données", () => {
    const available = [
      { permission: "PRODUCT_UPDATE", label: "Modifier un produit" },
      { permission: "PRODUCT_DEACTIVATE", label: "Archiver un produit" },
      { permission: "MEMBER_SUSPEND", label: "Suspendre un membre" },
    ];
    const selected = ["PRODUCT_UPDATE", "UNKNOWN_PERMISSION"];

    expect(groupMemberPermissions(available, selected)).toMatchObject([
      {
        key: "Produits",
        selectedCount: 1,
        permissions: [
          { permission: "PRODUCT_DEACTIVATE", selected: false },
          { permission: "PRODUCT_UPDATE", selected: true },
        ],
      },
      { key: "Équipe", selectedCount: 0 },
      {
        key: "Autres",
        selectedCount: 1,
        permissions: [{ permission: "UNKNOWN_PERMISSION", selected: true }],
      },
    ]);
    expect(available.map((item) => item.permission)).toEqual([
      "PRODUCT_UPDATE", "PRODUCT_DEACTIVATE", "MEMBER_SUSPEND",
    ]);
    expect(selected).toEqual(["PRODUCT_UPDATE", "UNKNOWN_PERMISSION"]);
  });

  it("conserve les changements de permissions jusqu’à leur enregistrement", () => {
    expect(source).toContain("setPermissionDraft([...selected.permissions])");
    expect(source).toContain("Enregistrer les modifications");
    expect(source).toContain("Annuler");
    expect(source).toContain("savePermissionChanges");
    expect(source).toContain('role="status"');
    expect(source).toContain("await detail.json()");
  });

  it("affiche les quatre permissions de messagerie avec leurs descriptions", () => {
    const messaging = localizedPermissionCatalog("fr").filter((permission) => permission.group === "Messagerie");

    expect(messaging).toHaveLength(4);
    expect(messaging.map((permission) => permission.code)).toEqual([
      "MESSAGING_VIEW", "MESSAGING_REPLY", "MESSAGING_ASSIGN", "MESSAGING_MANAGE",
    ]);
    expect(messaging.every((permission) => permission.label && permission.description)).toBe(true);
    expect(groupMemberPermissions(
      messaging.map((permission) => ({ permission: permission.code, label: permission.label, description: permission.description })),
      ["MESSAGING_VIEW"],
    )).toMatchObject([{ key: "Messagerie", selectedCount: 1, permissions: [{ permission: "MESSAGING_ASSIGN" }, { permission: "MESSAGING_VIEW", selected: true }, { permission: "MESSAGING_MANAGE" }, { permission: "MESSAGING_REPLY" }] }]);
  });

  it("normalise les dépendances de messagerie dans l’état des cases", () => {
    expect(normalizeMessagingPermissions(["PRODUCT_VIEW", "MESSAGING_REPLY"])).toEqual([
      "PRODUCT_VIEW", "MESSAGING_REPLY", "MESSAGING_VIEW",
    ]);
    expect(normalizeMessagingPermissions(["PRODUCT_VIEW", "MESSAGING_ASSIGN"])).toContain("MESSAGING_VIEW");
    expect(normalizeMessagingPermissions(["PRODUCT_VIEW"])).toEqual(["PRODUCT_VIEW"]);
    expect(updatePermissionSelection(
      ["PRODUCT_VIEW", "MESSAGING_VIEW", "MESSAGING_REPLY", "MESSAGING_ASSIGN"],
      "MESSAGING_VIEW",
      false,
    )).toEqual(["PRODUCT_VIEW"]);
    expect(updatePermissionSelection([], "MESSAGING_MANAGE", true)).toEqual([
      "MESSAGING_MANAGE", "MESSAGING_VIEW",
    ]);
  });

  it("présente les permissions du propriétaire en lecture seule", () => {
    expect(source).toContain('t("messagingPermissions", "ownerReadOnly")');
    expect(source).toContain("selected.is_owner ? <>");
    expect(source).toContain("readOnly selectedPermissions={selected.permissions}");
  });
});
