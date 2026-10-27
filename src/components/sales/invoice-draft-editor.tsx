"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  if (permissions !== null && !canUpdate) return <main><h1 className="text-3xl font-semibold">Modifier la facture</h1><p className="mt-4 text-[var(--error)]" role="alert">Vous n’êtes pas autorisé à modifier les factures.</p></main>;
  return <main><Link className="nav-link text-sm" href={back}>← Facture</Link><h1 className="mt-3 text-3xl font-semibold">Modifier la facture</h1>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{!invoice ? <p className="mt-5">Chargement…</p> : <form className="content-panel mt-5 grid max-w-2xl gap-4 p-5" onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget); }}><label>Nom du client<input className="mt-1 w-full rounded border p-2" defaultValue={invoice.customer_name_snapshot} maxLength={200} name="customer_name" required /></label><label>Client enregistré (facultatif)<select className="mt-1 w-full rounded border p-2" defaultValue={invoice.customer ?? ""} name="customer"><option value="">Aucun — saisie libre</option>{invoice.customer && !customers.some((customer) => customer.public_id === invoice.customer) ? <option value={invoice.customer}>Client actuel</option> : null}{customers.filter((customer) => customer.is_active).map((customer) => <option key={customer.public_id} value={customer.public_id}>{customer.name}</option>)}</select></label><label>Échéance<input className="mt-1 w-full rounded border p-2" defaultValue={invoice.due_date ?? ""} name="due_date" type="date" /></label><label>Référence<input className="mt-1 w-full rounded border p-2" defaultValue={invoice.reference} maxLength={120} name="reference" /></label><label>Notes<textarea className="mt-1 min-h-28 w-full rounded border p-2" defaultValue={invoice.notes} name="notes" /></label><div className="flex gap-3"><button className="button button-primary" disabled={saving} type="submit">{saving ? "Enregistrement…" : "Enregistrer"}</button><Link className="button button-outline" href={back}>Annuler</Link></div></form>}</main>;
}
