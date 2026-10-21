import type { Locale } from "@/lib/i18n/locale";

export const messages = {
  fr: {
    common: { language: "Langue", french: "Français", english: "English", saving: "Enregistrement…", saved: "Préférence enregistrée.", retry: "Réessayer" },
    navigation: { home: "Accueil", features: "Fonctionnalités", pricing: "Tarifs", contact: "Contact", workspace: "Mon espace", login: "Connexion", logout: "Se déconnecter", logoutPending: "Déconnexion…", settings: "Paramètres du compte", businesses: "Mes entreprises", invitations: "Invitations reçues", dashboard: "Tableau de bord", products: "Produits", inventory: "Stocks", purchases: "Achats", sales: "Ventes", partners: "Partenaires commerciaux", finance: "Finance", businessSettings: "Paramètres entreprise", backToWorkspace: "Retour à mon espace" },
    settings: { account: "MON COMPTE", title: "Paramètres du compte", interfaceLanguage: "Langue de l’interface", interfaceLanguageDescription: "Choisissez la langue utilisée pour l’interface. Ce choix est associé à votre compte.", personalAccount: "Compte personnel", personalDescription: "Les informations d’identité et la session sont gérées de manière sécurisée par Carri Account.", workspaces: "Espaces entreprises", workspacesDescription: "Créez ou ouvrez un espace entreprise depuis la liste de vos entreprises. Le choix d’une entreprise n’est jamais global à votre compte.", updateError: "La langue n’a pas pu être enregistrée. Réessayez." },
  },
  en: {
    common: { language: "Language", french: "Français", english: "English", saving: "Saving…", saved: "Preference saved.", retry: "Try again" },
    navigation: { home: "Home", features: "Features", pricing: "Pricing", contact: "Contact", workspace: "My workspace", login: "Sign in", logout: "Sign out", logoutPending: "Signing out…", settings: "Account settings", businesses: "My businesses", invitations: "Received invitations", dashboard: "Dashboard", products: "Products", inventory: "Inventory", purchases: "Purchases", sales: "Sales", partners: "Business partners", finance: "Finance", businessSettings: "Business settings", backToWorkspace: "Back to my workspace" },
    settings: { account: "MY ACCOUNT", title: "Account settings", interfaceLanguage: "Interface language", interfaceLanguageDescription: "Choose the language used by the interface. This choice is linked to your account.", personalAccount: "Personal account", personalDescription: "Identity information and the session are securely managed by Carri Account.", workspaces: "Business workspaces", workspacesDescription: "Create or open a business workspace from your business list. A business selection is never global to your account.", updateError: "The language could not be saved. Please try again." },
  },
} as const;

export type MessageKey = "common" | "navigation" | "settings";
export function message(locale: Locale, section: MessageKey, key: string): string {
  const group = messages[locale][section] as Record<string, string>;
  return group[key] ?? (messages.fr[section] as Record<string, string>)[key] ?? key;
}
