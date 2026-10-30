"use client";

import { useMemo } from "react";

import { useLocale } from "@/components/i18n/locale-provider";
import { permissionByCode, permissionLabel, updatePermissionSelection, type PermissionGroup } from "@/lib/permissions/catalog";

export type AvailablePermission = { permission: string; label: string; description?: string };
export type GroupedPermission = AvailablePermission & { selected: boolean };
export type PermissionGroupView = {
  key: PermissionGroup | "Autres";
  label: string;
  icon: string;
  selectedCount: number;
  permissions: GroupedPermission[];
};

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
const groupOrder: Array<PermissionGroup | "Autres"> = [
  "Produits", "Stocks", "Ventes", "Factures", "Achats", "Messagerie", "Partenaires", "Finance",
  "Dépenses", "Rapports", "Équipe", "Entreprise", "Autres",
];
const groupLabels: Record<PermissionGroup | "Autres", string> = {
  Produits: "Produits", Stocks: "Stocks", Ventes: "Ventes", Factures: "Factures", Achats: "Achats",
  Partenaires: "Partenaires", Finance: "Finance", Dépenses: "Dépenses",
  Rapports: "Rapports", Équipe: "Membres", Entreprise: "Entreprise", Messagerie: "Messagerie", Autres: "Autres",
};
const groupIcons: Record<PermissionGroup | "Autres", string> = {
  Produits: "▦", Stocks: "▤", Ventes: "↗", Factures: "▤", Achats: "↙", Partenaires: "♙",
  Finance: "¤", Dépenses: "−", Rapports: "▥", Équipe: "♟", Entreprise: "⌂", Messagerie: "✉", Autres: "…",
};

function labelFor(permission: string, available: Map<string, AvailablePermission>) {
  return available.get(permission)?.label ?? (permissionByCode.has(permission)
    ? permissionLabel(permission)
    : `Permission non reconnue (${permission})`);
}

export function groupMemberPermissions(
  availablePermissions: AvailablePermission[],
  selectedPermissions: readonly string[],
): PermissionGroupView[] {
  const available = new Map(availablePermissions.map((item) => [item.permission, item]));
  const selected = new Set(selectedPermissions);
  const codes = new Set([...available.keys(), ...selected]);
  const grouped = new Map<PermissionGroup | "Autres", GroupedPermission[]>();

  for (const permission of codes) {
    const definition = permissionByCode.get(permission);
    const group = definition?.group ?? "Autres";
    const values = grouped.get(group) ?? [];
    values.push({ permission, label: labelFor(permission, available), description: available.get(permission)?.description, selected: selected.has(permission) });
    grouped.set(group, values);
  }

  return groupOrder.flatMap((key) => {
    const permissions = grouped.get(key);
    if (!permissions?.length) return [];
    permissions.sort((left, right) => collator.compare(left.label, right.label));
    return [{
      key,
      label: groupLabels[key],
      icon: groupIcons[key],
      selectedCount: permissions.filter((permission) => permission.selected).length,
      permissions,
    }];
  });
}

type Props = {
  availablePermissions: AvailablePermission[];
  selectedPermissions: readonly string[];
  readOnly?: boolean;
  disabled?: boolean;
  canSelect?: (permission: string) => boolean;
  canDeselect?: (permission: string) => boolean;
  onChange?: (permissions: string[]) => void;
};

export function MemberPermissionGroups({
  availablePermissions,
  selectedPermissions,
  readOnly = false,
  disabled = false,
  canSelect = () => false,
  canDeselect = () => false,
  onChange,
}: Props) {
  const { t } = useLocale();
  const groups = useMemo(
    () => groupMemberPermissions(availablePermissions, selectedPermissions),
    [availablePermissions, selectedPermissions],
  );

  function toggle(permission: string, selected: boolean) {
    if (!onChange) return;
    onChange(updatePermissionSelection(selectedPermissions, permission, selected));
  }

  return <div className="grid max-h-[min(55vh,36rem)] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
    {groups.map((group) => <section className="min-w-0 rounded-md border border-[var(--line)] p-4" key={group.key}>
      <div className="flex items-center justify-between gap-3"><h4 className="font-medium"><span aria-hidden="true" className="mr-2 text-[var(--brand-primary)]">{group.icon}</span>{group.key === "Messagerie" ? t("messagingPermissions", "group") : group.label}</h4><span className="shrink-0 text-xs text-[var(--muted)]">{group.selectedCount} sélectionnée{group.selectedCount > 1 ? "s" : ""}</span></div>
      <ul className="mt-3 grid gap-2">{group.permissions.map(({ permission, label, description, selected }) => {
        const allowed = selected ? canDeselect(permission) : canSelect(permission);
        const inputDisabled = readOnly || disabled || !allowed;
        return <li key={permission}><label className="flex min-w-0 items-start gap-2 text-sm"><input aria-label={label} checked={selected} className="mt-1" disabled={inputDisabled} onChange={() => toggle(permission, !selected)} type="checkbox" /><span className="min-w-0 break-words">{label}{description ? <small className="block text-[var(--muted)]">{description}</small> : null}</span></label></li>;
      })}</ul>
    </section>)}
  </div>;
}
