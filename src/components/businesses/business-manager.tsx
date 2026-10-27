"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, FileText, Package, Receipt, Settings, ShoppingCart, Truck, WalletCards, Warehouse, type LucideIcon } from "lucide-react";

import { useBusinessPermissions } from "@/components/private/use-business-permissions";
import { useBusinessNameState } from "@/components/private/business-name-provider";
import { BusinessCommercialFields, type CommercialSettingsValue } from "@/components/businesses/business-commercial-fields";
import { useLocale } from "@/components/i18n/locale-provider";
import { BusinessListRequestError, fetchBusinesses, type ListedBusiness } from "@/lib/businesses/list-client";

type Business = ListedBusiness;

async function detail(response: Response) {
  try { return (await response.json() as { detail?: string }).detail ?? "Le service E-commerce est indisponible."; }
  catch { return "Le service E-commerce est indisponible."; }
}

export function BusinessList({ invitationOutcome }: { invitationOutcome?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Business[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchBusinesses());
    } catch (caught) {
      if (caught instanceof BusinessListRequestError && caught.status === 401) {
        router.replace("/connexion?erreur=session_expired");
        return;
      }
      setError(caught instanceof BusinessListRequestError ? caught.message : "Le service E-commerce est indisponible.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { startTransition(() => { void load(); }); }, [load]);

  if (error) return <section className="content-panel p-6" role="alert"><p>{error}</p><button className="button button-primary mt-4" disabled={loading} onClick={() => void load()} type="button">{loading ? "Nouvelle tentative…" : "Réessayer"}</button></section>;
  if (!items) return <p className="p-6 text-sm text-[var(--muted)]">Chargement des entreprises…</p>;

  const invitationNotice = invitationOutcome === "accepted"
    ? "Invitation acceptée. L’entreprise apparaît ci-dessous selon vos accès attribués."
    : invitationOutcome === "declined"
      ? "Invitation refusée."
      : null;

  return <main><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">ENTREPRISES</p><h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">Mes entreprises</h1></div><Link className="button button-primary" href="/espace/entreprises/nouvelle">Créer une entreprise</Link></div>{invitationNotice ? <p className="mt-4 rounded-md border p-3 text-sm" role="status">{invitationNotice}</p> : null}<section className="content-panel mt-6 p-6"><h2 className="font-semibold">Entreprises accessibles</h2>{items.length === 0 ? <div className="mt-3"><p className="text-sm text-[var(--muted)]">Vous n’avez accès à aucune entreprise pour le moment.</p><Link className="button button-outline mt-5" href="/espace/entreprises/nouvelle">Créer une entreprise</Link></div> : <ul className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((business) => <li className="rounded-md border p-4" key={business.public_id}><strong>{business.name}</strong><span className="mt-1 block text-sm text-[var(--muted)]">{business.status} · {business.primary_currency}</span><Link className="button button-outline mt-4" href={`/espace/entreprises/${business.public_id}`}>Entrer dans l’entreprise</Link></li>)}</ul>}</section></main>;
}

export function BusinessCreate() {
  const router = useRouter();
  const { t } = useLocale();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commercial, setCommercial] = useState<CommercialSettingsValue>({ sales_location_type: "", sales_channel: "", delivery_methods: [] });
  const [commercialErrors, setCommercialErrors] = useState<Partial<Record<keyof CommercialSettingsValue, string>>>({});
  const create = async (formData: FormData) => {
    if (saving) return;
    const validationErrors: Partial<Record<keyof CommercialSettingsValue, string>> = {};
    if (!commercial.sales_location_type) validationErrors.sales_location_type = t("businessCreate", "commercialRequired");
    if (!commercial.sales_channel) validationErrors.sales_channel = t("businessCreate", "commercialRequired");
    if (!commercial.delivery_methods.length) validationErrors.delivery_methods = t("businessCreate", "commercialRequired");
    setCommercialErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;
    setSaving(true);
    setError(null);
    const response = await fetch("/api/private/businesses", { method: "POST", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify({ name: formData.get("name"), primary_currency: formData.get("currency"), ...commercial }) });
    setSaving(false);
    if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
    if (!response.ok) return setError(await detail(response));
    router.push(`/espace/entreprises/${(await response.json() as { business: Business }).business.public_id}`);
  };

  return <main><Link className="nav-link text-sm" href="/espace/entreprises">← Mes entreprises</Link><h1 className="mt-3 text-3xl font-semibold text-[var(--brand-secondary)]">Créer une entreprise</h1><form action={create} className="content-panel mt-6 grid max-w-xl gap-6 p-6"><label>Nom<input className="mt-1 w-full rounded-md border px-3 py-2" name="name" required /></label><label>Devise principale<select className="mt-1 w-full rounded-md border px-3 py-2" defaultValue="CDF" name="currency"><option value="CDF">CDF</option><option value="USD">USD</option></select></label><BusinessCommercialFields errors={commercialErrors} onChange={setCommercial} value={commercial} />{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}<button className="button button-primary w-fit" disabled={saving} type="submit">{saving ? "Création…" : "Créer l’entreprise"}</button></form></main>;
}

const moduleLinks: { label: string; path: string; permissions: string[]; icon: LucideIcon; requiresAll?: boolean }[] = [
  { label: "Produits", path: "produits", icon: Package, permissions: ["PRODUCT_VIEW", "PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE", "PRODUCT_DEACTIVATE", "PRODUCT_VARIANT_VIEW", "PRODUCT_VARIANT_CREATE", "PRODUCT_VARIANT_UPDATE"] },
  { label: "Stocks", path: "stocks", icon: Warehouse, permissions: ["INVENTORY_VIEW", "INVENTORY_INITIALIZE", "INVENTORY_IN", "INVENTORY_OUT", "INVENTORY_ADJUST", "INVENTORY_MOVEMENT_VIEW"] },
  { label: "Achats", path: "achats", icon: Truck, permissions: ["PURCHASE_VIEW", "PURCHASE_CREATE", "PURCHASE_UPDATE", "PURCHASE_CONFIRM", "PURCHASE_RECEIVE", "PURCHASE_CANCEL", "PURCHASE_LINE_VIEW", "PURCHASE_LINE_CREATE"] },
  { label: "Ventes", path: "ventes", icon: Receipt, permissions: ["SALE_VIEW", "SALE_CREATE", "SALE_UPDATE", "SALE_COMPLETE", "SALE_CANCEL", "SALE_LINE_VIEW", "SALE_LINE_CREATE", "SALE_RETURN", "SALE_RETURN_VIEW"] },
  { label: "Caisse", path: "caisse", icon: ShoppingCart, permissions: ["SALE_VIEW", "SALE_CREATE", "SALE_LINE_CREATE", "SALE_COMPLETE"], requiresAll: true },
  { label: "Factures", path: "factures", icon: FileText, permissions: ["INVOICE_VIEW", "INVOICE_CREATE", "INVOICE_UPDATE", "INVOICE_ISSUE", "INVOICE_CANCEL", "INVOICE_LINE_VIEW", "INVOICE_LINE_CREATE"] },
  { label: "Finance", path: "finance", icon: WalletCards, permissions: ["FINANCIAL_SUMMARY_VIEW", "FINANCIAL_MOVEMENT_VIEW", "RECEIVABLE_VIEW", "RECEIVABLE_UPDATE", "RECEIVABLE_PAYMENT_CREATE", "INVOICE_PAYMENT_CREATE", "SUPPLIER_PAYMENT_CREATE"] },
  { label: "Paramètres entreprise", path: "parametres", icon: Settings, permissions: ["BUSINESS_UPDATE", "MEMBER_VIEW", "MEMBER_PERMISSION_VIEW", "INVITATION_VIEW", "INVITATION_CREATE", "MEMBER_UPDATE"] },
];

export function BusinessEditor({ businessId }: { businessId: string }) {
  const permissions = useBusinessPermissions(businessId);
  const businessState = useBusinessNameState();
  const business = businessState?.business ?? null;
  const error = businessState?.error ?? null;

  const links = permissions ? moduleLinks.filter((link) => link.requiresAll ? link.permissions.every((permission) => permissions.includes(permission)) : link.permissions.some((permission) => permissions.includes(permission))) : [];
  return <main><Link className="nav-link inline-flex items-center gap-1 text-sm" href="/espace"><Building2 aria-hidden="true" size={16} />Retour à mon espace</Link><section className="app-card mt-5 overflow-hidden p-5 sm:p-7"><p className="eyebrow">ESPACE ENTREPRISE</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-[var(--brand-secondary)] sm:text-3xl">{business ? business.name : "Tableau de bord entreprise"}</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Accédez aux modules autorisés pour piloter vos opérations en toute sécurité.</p></div><span className="status-badge status-info">{links.length} module{links.length > 1 ? "s" : ""} accessible{links.length > 1 ? "s" : ""}</span></div></section>{error ? <p className="app-alert mt-4" role="alert">{error}</p> : null}<section className="mt-6"><h2 className="text-lg font-semibold">Modules de gestion</h2><p className="mt-1 text-sm text-[var(--muted)]">Vos accès reflètent les permissions attribuées à votre rôle.</p>{permissions === null ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div className="skeleton h-36" key={item} />)}</div> : links.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{links.map((link) => { const Icon = link.icon; return <Link className="app-card app-card-interactive group block p-5" href={`/espace/entreprises/${businessId}/${link.path}`} key={link.path}><span className="grid size-11 place-items-center rounded-xl bg-[var(--surface-muted)] text-[var(--brand)]"><Icon aria-hidden="true" size={22} /></span><h3 className="mt-4 font-semibold group-hover:text-[var(--brand)]">{link.label}</h3><p className="mt-1 text-sm text-[var(--muted)]">Ouvrir le module</p></Link>; })}</div> : <div className="empty-state mt-4"><p>Aucun module n’est accessible avec vos permissions actuelles.</p></div>}</section></main>;
}
