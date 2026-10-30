import type { Locale } from "@/lib/i18n/locale";
import { message } from "@/lib/i18n/messages";

export type PermissionGroup = "Entreprise" | "Équipe" | "Produits" | "Stocks" | "Achats" | "Ventes" | "Factures" | "Partenaires" | "Finance" | "Dépenses" | "Rapports" | "Messagerie";
export type PermissionDefinition = { code: string; label: string; description: string; group: PermissionGroup };

const entries: Array<[PermissionGroup, string, string, string]> = [
  ["Entreprise", "BUSINESS_UPDATE", "Modifier l’entreprise", "Modifier les informations et paramètres de l’entreprise."],
  ["Entreprise", "PAYMENT_METHOD_VIEW", "Consulter les moyens de paiement", "Consulter tous les moyens de paiement, y compris inactifs."],
  ["Entreprise", "PAYMENT_METHOD_CREATE", "Créer un moyen de paiement", "Ajouter un moyen de paiement à l’entreprise."],
  ["Entreprise", "PAYMENT_METHOD_UPDATE", "Modifier un moyen de paiement", "Modifier ou changer l’état d’un moyen de paiement."],
  ["Équipe", "MEMBER_VIEW", "Consulter les membres", "Afficher la liste et le détail des membres."],
  ["Équipe", "MEMBER_UPDATE", "Modifier un membre", "Modifier la fonction descriptive d’un membre."],
  ["Équipe", "MEMBER_SUSPEND", "Suspendre un membre", "Suspendre l’accès d’un membre actif."],
  ["Équipe", "MEMBER_REACTIVATE", "Réactiver un membre", "Réactiver un membre suspendu."],
  ["Équipe", "MEMBER_REMOVE", "Retirer un membre", "Retirer logiquement un membre de l’entreprise."],
  ["Équipe", "MEMBER_PERMISSION_VIEW", "Consulter les permissions", "Afficher les permissions explicites des membres."],
  ["Équipe", "MEMBER_PERMISSION_GRANT", "Attribuer une permission", "Attribuer un droit explicite sans auto-élévation."],
  ["Équipe", "MEMBER_PERMISSION_REVOKE", "Révoquer une permission", "Retirer un droit explicite à un membre."],
  ["Équipe", "INVITATION_VIEW", "Consulter les invitations", "Afficher les invitations de l’entreprise."],
  ["Équipe", "INVITATION_CREATE", "Inviter un membre", "Créer et envoyer une invitation."],
  ["Équipe", "INVITATION_RESEND", "Renvoyer une invitation", "Renvoyer une invitation en attente ou expirée."],
  ["Équipe", "INVITATION_REVOKE", "Révoquer une invitation", "Révoquer une invitation en attente."],
  ["Produits", "PRODUCT_VIEW", "Consulter les produits", "Afficher le catalogue des produits."],
  ["Produits", "PRODUCT_CREATE", "Créer un produit", "Ajouter un produit au catalogue."],
  ["Produits", "PRODUCT_UPDATE", "Modifier un produit", "Modifier les informations d’un produit."],
  ["Produits", "PRODUCT_DELETE", "Supprimer un produit", "Supprimer un produit éligible sans référence métier."],
  ["Produits", "PRODUCT_DEACTIVATE", "Archiver un produit", "Archiver un produit en conservant son historique."],
  ["Produits", "PRODUCT_VARIANT_VIEW", "Consulter les variantes", "Afficher les variantes d’un produit."],
  ["Produits", "PRODUCT_VARIANT_CREATE", "Créer une variante", "Ajouter une variante à un produit."],
  ["Produits", "PRODUCT_VARIANT_UPDATE", "Modifier une variante", "Modifier une variante existante."],
  ["Stocks", "INVENTORY_VIEW", "Consulter les stocks", "Afficher les soldes de stock."],
  ["Stocks", "INVENTORY_INITIALIZE", "Initialiser un stock", "Créer un suivi de stock avec un solde nul."],
  ["Stocks", "INVENTORY_IN", "Enregistrer une entrée", "Ajouter une entrée manuelle traçable."],
  ["Stocks", "INVENTORY_OUT", "Enregistrer une sortie", "Ajouter une sortie manuelle traçable."],
  ["Stocks", "INVENTORY_ADJUST", "Ajuster un stock", "Fixer un nouveau solde avec justification."],
  ["Stocks", "INVENTORY_MOVEMENT_VIEW", "Consulter les mouvements", "Afficher l’historique immuable des mouvements."],
  ["Achats", "PURCHASE_VIEW", "Consulter les achats", "Afficher les achats."],
  ["Achats", "PURCHASE_CREATE", "Créer un achat", "Créer un brouillon d’achat."],
  ["Achats", "PURCHASE_UPDATE", "Modifier un achat", "Modifier un achat encore en brouillon."],
  ["Achats", "PURCHASE_CONFIRM", "Confirmer un achat", "Confirmer un achat en brouillon."],
  ["Achats", "PURCHASE_RECEIVE", "Réceptionner un achat", "Réceptionner et alimenter le stock."],
  ["Achats", "PURCHASE_CANCEL", "Annuler un achat", "Annuler un achat selon son état."],
  ["Achats", "PURCHASE_LINE_VIEW", "Consulter les lignes d’achat", "Afficher les lignes d’un achat."],
  ["Achats", "PURCHASE_LINE_CREATE", "Ajouter une ligne d’achat", "Ajouter une ligne à un brouillon."],
  ["Achats", "PURCHASE_LINE_UPDATE", "Modifier une ligne d’achat", "Modifier une ligne de brouillon."],
  ["Achats", "PURCHASE_LINE_DELETE", "Supprimer une ligne d’achat", "Retirer une ligne d’un brouillon."],
  ["Partenaires", "SUPPLIER_VIEW", "Consulter les fournisseurs", "Afficher le répertoire fournisseurs."],
  ["Partenaires", "SUPPLIER_CREATE", "Créer un fournisseur", "Ajouter un fournisseur."],
  ["Partenaires", "SUPPLIER_UPDATE", "Modifier un fournisseur", "Modifier les coordonnées d’un fournisseur."],
  ["Partenaires", "SUPPLIER_DEACTIVATE", "Désactiver un fournisseur", "Désactiver un fournisseur sans supprimer son historique."],
  ["Partenaires", "SUPPLIER_REACTIVATE", "Réactiver un fournisseur", "Réactiver un fournisseur désactivé."],
  ["Ventes", "SALE_VIEW", "Consulter les ventes", "Afficher les ventes."],
  ["Ventes", "SALE_CREATE", "Créer une vente", "Créer un brouillon de vente et utiliser les sélections limitées."],
  ["Ventes", "SALE_UPDATE", "Modifier une vente", "Modifier un brouillon de vente."],
  ["Ventes", "SALE_COMPLETE", "Finaliser une vente", "Finaliser la vente, le stock et les écritures associées."],
  ["Ventes", "SALE_CANCEL", "Annuler une vente", "Annuler une vente selon son état."],
  ["Ventes", "SALE_LINE_VIEW", "Consulter les lignes de vente", "Afficher les lignes d’une vente."],
  ["Ventes", "SALE_LINE_CREATE", "Ajouter une ligne de vente", "Ajouter une ligne à un brouillon."],
  ["Ventes", "SALE_RETURN_VIEW", "Consulter les retours", "Afficher les retours d’une vente."],
  ["Ventes", "SALE_RETURN", "Créer un retour", "Créer un retour de vente atomique."],
  ["Factures", "INVOICE_VIEW", "Consulter les factures", "Afficher uniquement les factures autorisées."],
  ["Factures", "INVOICE_CREATE", "Créer une facture", "Créer un brouillon de facture."],
  ["Factures", "INVOICE_UPDATE", "Modifier une facture", "Modifier les lignes et informations d’un brouillon de facture."],
  ["Factures", "INVOICE_ISSUE", "Émettre une facture", "Émettre une facture et enregistrer son paiement initial éventuel."],
  ["Factures", "INVOICE_CANCEL", "Annuler une facture", "Annuler un brouillon de facture."],
  ["Factures", "INVOICE_PAYMENT_CREATE", "Encaisser une facture", "Enregistrer un règlement sur une facture."],
  ["Partenaires", "CUSTOMER_VIEW", "Consulter les clients", "Afficher le répertoire clients."],
  ["Partenaires", "CUSTOMER_CREATE", "Créer un client", "Ajouter un client."],
  ["Partenaires", "CUSTOMER_UPDATE", "Modifier un client", "Modifier les coordonnées d’un client."],
  ["Partenaires", "CUSTOMER_DEACTIVATE", "Désactiver un client", "Désactiver un client sans supprimer son historique."],
  ["Partenaires", "CUSTOMER_REACTIVATE", "Réactiver un client", "Réactiver un client désactivé."],
  ["Finance", "SUPPLIER_PAYMENT_VIEW", "Consulter les paiements fournisseurs", "Afficher les paiements d’un achat."],
  ["Finance", "SUPPLIER_PAYMENT_CREATE", "Payer un fournisseur", "Enregistrer un paiement fournisseur."],
  ["Finance", "SUPPLIER_PAYMENT_REVERSE", "Révoquer un paiement fournisseur", "Contrepasser un paiement fournisseur."],
  ["Finance", "RECEIVABLE_VIEW", "Consulter les créances", "Afficher les créances clients."],
  ["Finance", "RECEIVABLE_UPDATE", "Modifier une créance", "Modifier son échéance ou ses notes."],
  ["Finance", "RECEIVABLE_PAYMENT_VIEW", "Consulter les règlements clients", "Afficher les règlements d’une créance."],
  ["Finance", "RECEIVABLE_PAYMENT_CREATE", "Encaisser une créance", "Enregistrer un règlement client."],
  ["Finance", "FINANCIAL_SUMMARY_VIEW", "Consulter la synthèse financière", "Afficher les agrégats financiers."],
  ["Finance", "FINANCIAL_MOVEMENT_VIEW", "Consulter les mouvements financiers", "Afficher le journal financier."],
  ["Dépenses", "EXPENSE_CATEGORY_VIEW", "Consulter les catégories de dépense", "Afficher les catégories de dépense."],
  ["Dépenses", "EXPENSE_CATEGORY_CREATE", "Créer une catégorie de dépense", "Ajouter une catégorie de dépense."],
  ["Dépenses", "EXPENSE_CATEGORY_UPDATE", "Modifier une catégorie de dépense", "Modifier une catégorie autorisée."],
  ["Dépenses", "EXPENSE_VIEW", "Consulter les dépenses", "Afficher les dépenses."],
  ["Dépenses", "EXPENSE_CREATE", "Créer une dépense", "Enregistrer une dépense."],
  ["Dépenses", "EXPENSE_UPDATE", "Modifier une dépense", "Modifier une dépense autorisée."],
  ["Dépenses", "EXPENSE_CANCEL", "Annuler une dépense", "Annuler une dépense avec justification."],
  ["Dépenses", "EXPENSE_PAYMENT_VIEW", "Consulter les paiements de dépense", "Afficher les paiements d’une dépense."],
  ["Dépenses", "EXPENSE_PAYMENT_CREATE", "Payer une dépense", "Enregistrer un paiement de dépense."],
  ["Dépenses", "EXPENSE_PAYMENT_REVERSE", "Révoquer un paiement de dépense", "Contrepasser un paiement de dépense."],
  ["Rapports", "DASHBOARD_VIEW", "Consulter le tableau de bord", "Afficher les indicateurs du tableau de bord."],
  ["Rapports", "PROFITABILITY_VIEW", "Consulter la rentabilité", "Afficher les indicateurs de rentabilité."],
  ["Rapports", "SALE_REPORT_VIEW", "Consulter le rapport des ventes", "Afficher le rapport des ventes."],
  ["Rapports", "PURCHASE_REPORT_VIEW", "Consulter le rapport des achats", "Afficher le rapport des achats."],
  ["Rapports", "EXPENSE_RECEIVABLE_REPORT_VIEW", "Consulter le rapport dépenses-créances", "Afficher le rapport croisé dépenses et créances."],
  ["Messagerie", "MESSAGING_VIEW", "Consulter les conversations", "Permet de consulter les conversations entre les acheteurs et l’entreprise."],
  ["Messagerie", "MESSAGING_REPLY", "Répondre aux acheteurs", "Permet d’envoyer des messages aux acheteurs au nom de l’entreprise."],
  ["Messagerie", "MESSAGING_ASSIGN", "Attribuer les conversations", "Permet d’attribuer ou de réattribuer une conversation à un membre autorisé."],
  ["Messagerie", "MESSAGING_MANAGE", "Gérer la messagerie", "Permet de gérer les statuts des conversations et les paramètres de messagerie de l’entreprise."],
];

export const permissionCatalog: PermissionDefinition[] = entries.map(([group, code, label, description]) => ({ group, code, label, description }));
export const permissionByCode = new Map(permissionCatalog.map((permission) => [permission.code, permission]));
const messagingMessageKeys: Record<string, { label: string; description: string }> = {
  MESSAGING_VIEW: { label: "viewLabel", description: "viewDescription" },
  MESSAGING_REPLY: { label: "replyLabel", description: "replyDescription" },
  MESSAGING_ASSIGN: { label: "assignLabel", description: "assignDescription" },
  MESSAGING_MANAGE: { label: "manageLabel", description: "manageDescription" },
};
export const localizedPermissionCatalog = (locale: Locale): PermissionDefinition[] => permissionCatalog.map((permission) => {
  const keys = messagingMessageKeys[permission.code];
  return keys ? { ...permission, label: message(locale, "messagingPermissions", keys.label), description: message(locale, "messagingPermissions", keys.description) } : permission;
});
export const permissionLabel = (code: string, locale: Locale = "fr") => localizedPermissionCatalog(locale).find((permission) => permission.code === code)?.label ?? "Permission non reconnue";
export const permissionDescription = (code: string, locale: Locale = "fr") => localizedPermissionCatalog(locale).find((permission) => permission.code === code)?.description ?? "Ce code de permission n’est pas reconnu par cette version de l’application.";
export const messagingPermissionCodes = ["MESSAGING_VIEW", "MESSAGING_REPLY", "MESSAGING_ASSIGN", "MESSAGING_MANAGE"] as const;
export function normalizeMessagingPermissions(permissions: readonly string[]): string[] {
  const normalized = new Set(permissions);
  const hasDependent = messagingPermissionCodes.slice(1).some((permission) => normalized.has(permission));
  if (hasDependent) normalized.add("MESSAGING_VIEW");
  if (!normalized.has("MESSAGING_VIEW")) messagingPermissionCodes.slice(1).forEach((permission) => normalized.delete(permission));
  return [...normalized];
}
export function updatePermissionSelection(current: readonly string[], permission: string, selected: boolean): string[] {
  if (permission === "MESSAGING_VIEW" && !selected) {
    return current.filter((value) => !messagingPermissionCodes.includes(value as typeof messagingPermissionCodes[number]));
  }
  const next = selected ? [...current, permission] : current.filter((value) => value !== permission);
  return normalizeMessagingPermissions(next);
}
export const hasAnyPermission = (permissions: readonly string[], expected: readonly string[]) => expected.some((permission) => permissions.includes(permission));
