"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePenLine, Save, UserRound } from "lucide-react";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";

type DraftInvoice = {
  public_id: string;
  customer: string | null;
  operation_type: "DIRECT_SALE" | "INVOICE";
  status: "DRAFT" | "COMPLETED" | "CANCELLED";
  customer_name_snapshot: string;
  due_date: string | null;
  reference: string;
  notes: string;
};
type Customer = { public_id: string; name: string; is_active: boolean };

const detail = async (response: Response) => {
  try { return (await response.json() as { detail?: string }).detail ?? "La facture ne peut pas être modifiée."; }
  catch { return "La facture ne peut pas être modifiée."; }
};

export function InvoiceDraftEditor({ businessId, saleId }: { businessId: string; saleId: string }) {
  const router = useRouter();
  const permissions = useBusinessPermissions(businessId);
  const request = useRef(0);
  const [invoice, setInvoice] = useState<DraftInvoice | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canUpdate = permissions?.includes("INVOICE_UPDATE") ?? false;

  const load = useCallback(async () => {
    const version = ++request.current;
    try {
      const [response, customersResponse] = await Promise.all([
        fetch(`/api/private/businesses/${businessId}/sales/${saleId}`, { credentials: "same-origin" }),
        fetch(`/api/private/businesses/${businessId}/customers/search?page_size=50`, { credentials: "same-origin" }),
      ]);
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) throw new Error();
      const nextInvoice = (await response.json() as { sale: DraftInvoice }).sale;
      if (request.current !== version) return;
      if (nextInvoice.operation_type !== "INVOICE" || nextInvoice.status !== "DRAFT") {
        router.replace(`/espace/entreprises/${businessId}/factures/${saleId}`);
        return;
      }
      setInvoice(nextInvoice);
      if (customersResponse.ok) setCustomers((await customersResponse.json() as { customers: Customer[] }).customers);
      setError(null);
    } catch { if (request.current === version) setError("La facture brouillon est indisponible."); }
  }, [businessId, router, saleId]);

  useEffect(() => {
    // La requête est une synchronisation avec le BFF ; le différé évite une mise à jour
    // d'état pendant la phase de montage et l'invalidation empêche les réponses obsolètes.
    void Promise.resolve().then(load);
    return () => { request.current += 1; };
  }, [load]);

  async function save(form: HTMLFormElement) {
    if (!invoice) return;
    const data = new FormData(form);
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/sales/${saleId}`, {
        method: "PATCH", credentials: "same-origin",
        headers: { "content-type": "application/json", "x-csrf-protection": "1" },
        body: JSON.stringify({
          customer_name_snapshot: data.get("customer_name")?.toString().trim(),
          customer: data.get("customer") || null,
          due_date: data.get("due_date") || null,
          reference: data.get("reference")?.toString().trim(),
          notes: data.get("notes")?.toString().trim(),
        }),
      });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await detail(response));
      router.replace(`/espace/entreprises/${businessId}/factures/${saleId}`);
    } catch { setError("La facture ne peut pas être enregistrée pour le moment."); }
    finally { setSaving(false); }
  }

  const back = `/espace/entreprises/${businessId}/factures/${saleId}`;
  if (permissions !== null && !canUpdate) return <main><h1 className="text-3xl font-semibold">Modifier la facture</h1><p className="app-alert mt-5" role="alert">Vous n’êtes pas autorisé à modifier les factures.</p></main>;
  return <main className="min-w-0"><Link className="nav-link text-sm" href={back}>← Facture</Link><div className="mt-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--brand)]"><FilePenLine aria-hidden="true" size={20} /></span><div><h1 className="text-3xl font-semibold">Modifier la facture</h1><p className="mt-1 text-sm text-[var(--muted)]">Les modifications restent limitées au brouillon.</p></div></div>{error ? <p className="app-alert mt-5" role="alert">{error}</p> : null}{!invoice ? <p className="mt-5 text-sm text-[var(--muted)]">Chargement…</p> : <form className="content-panel mt-6 grid max-w-3xl gap-6 p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget); }}><section><div className="flex items-center gap-2"><UserRound aria-hidden="true" className="text-[var(--brand)]" size={20} /><h2 className="text-lg font-semibold">Client</h2></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium">Nom du client<input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 font-normal" defaultValue={invoice.customer_name_snapshot} maxLength={200} name="customer_name" required /></label><label className="grid gap-1 text-sm font-medium">Client enregistré <span className="font-normal text-[var(--muted)]">(facultatif)</span><select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 font-normal" defaultValue={invoice.customer ?? ""} name="customer"><option value="">Aucun — saisie libre</option>{invoice.customer && !customers.some((customer) => customer.public_id === invoice.customer) ? <option value={invoice.customer}>Client actuel</option> : null}{customers.filter((customer) => customer.is_active).map((customer) => <option key={customer.public_id} value={customer.public_id}>{customer.name}</option>)}</select></label></div></section><section className="border-t border-[var(--line)] pt-6"><h2 className="text-lg font-semibold">Informations de facture</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium">Échéance<input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 font-normal" defaultValue={invoice.due_date ?? ""} name="due_date" type="date" /></label><label className="grid gap-1 text-sm font-medium">Référence<input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 font-normal" defaultValue={invoice.reference} maxLength={120} name="reference" /></label><label className="grid gap-1 text-sm font-medium sm:col-span-2">Notes<textarea className="min-h-28 rounded-lg border border-[var(--line)] bg-white px-3 py-2 font-normal" defaultValue={invoice.notes} name="notes" /></label></div></section><div className="flex flex-wrap gap-3 border-t border-[var(--line)] pt-6"><button className="button button-primary inline-flex min-h-11 items-center gap-2" disabled={saving} type="submit"><Save aria-hidden="true" size={18} />{saving ? "Enregistrement…" : "Enregistrer"}</button><Link className="button button-outline min-h-11" href={back}>Annuler</Link></div></form>}</main>;
}
