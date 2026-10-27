"use client";
import { startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";
type Receivable = { public_id: string; sale: string; customer: string; currency: string; original_amount: string; paid_amount: string; balance: string; status: string; is_overdue: boolean };
type Purchase = { public_id: string; supplier: string | null; currency: string; total: string; paid_amount: string; balance: string; payment_status: string; status: string };
type Movement = { public_id: string; direction: string; amount: string; currency: string; payment_method: string; event_type: string; occurred_at: string; reason: string };
type Summary = { currency: string; total_inflow: string; total_outflow: string; net_flow: string; by_payment_method: { payment_method: string; total_inflow: string; total_outflow: string; net_flow: string }[] };
export type Method = { public_id: string; name: string; category: string; is_active: boolean };
export type PaymentMethodOption = { key: string; label: string; value: string };
const categories = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CARD", "OTHER"];
export function activePaymentMethodOptions(methods: Method[]): PaymentMethodOption[] { return methods.filter((method) => method.is_active).map((method) => ({ key: method.public_id, label: method.name, value: method.category })); }
export function canCreateInvoicePayment(permissions: string[] | null | undefined): boolean { return permissions?.includes("INVOICE_PAYMENT_CREATE") ?? false; }
export function paymentMethodsForBusiness(methodsByBusiness: Record<string, Method[]>, businessId: string): Method[] { return methodsByBusiness[businessId] ?? []; }
async function message(response: Response) { try { return (await response.json() as { detail?: string }).detail ?? "Les données financières sont indisponibles."; } catch { return "Les données financières sont indisponibles."; } }
function PaymentForm({ businessId, kind, onSaved, allowed, methods = [], target }: { businessId: string; kind: "receivable" | "purchase"; onSaved: () => void; allowed: boolean; methods?: Method[]; target?: string }) { const router = useRouter(); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null); const [open, setOpen] = useState(false); const paymentOptions = kind === "receivable" ? activePaymentMethodOptions(methods) : categories.map((category) => ({ key: category, label: category, value: category })); const hasAvailableMethod = paymentOptions.length > 0; async function submit(form: HTMLFormElement) { setSaving(true); setError(null); const data = new FormData(form); const paymentTarget = data.get("target")?.toString().trim(); const key = crypto.randomUUID(); const path = kind === "receivable" ? `/api/private/businesses/${businessId}/receivables/${paymentTarget}/payments` : `/api/private/businesses/${businessId}/purchases/${paymentTarget}/payments`; try { const response = await fetch(path, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1", "idempotency-key": key }, body: JSON.stringify({ amount: data.get("amount"), payment_method: data.get("payment_method"), reference: data.get("reference") || "", notes: data.get("notes") || "" }) }); if (response.status === 401) return router.replace("/connexion?erreur=session_expired"); if (!response.ok) return setError(await message(response)); form.reset(); setOpen(false); onSaved(); } catch { setError("Les données financières sont temporairement indisponibles."); } finally { setSaving(false); } } return <div id={kind === "receivable" ? "reglement-client" : undefined}>{allowed ? <button className="button button-outline" disabled={!hasAvailableMethod} onClick={() => setOpen(true)} type="button">{kind === "receivable" ? "Enregistrer un règlement client" : "Enregistrer un paiement fournisseur"}</button> : null}{allowed && !hasAvailableMethod ? <p className="self-center text-sm text-[var(--muted)]">Aucun moyen de paiement actif n’est configuré.</p> : null}{open ? <Modal onClose={() => setOpen(false)} title={kind === "receivable" ? "Règlement client" : "Paiement fournisseur"}><form aria-busy={saving} className="grid gap-3 p-1" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}><p className="text-sm text-[var(--muted)]">Le solde et l’écriture financière sont validés par Django.</p>{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}<label>Identifiant {kind === "receivable" ? "créance" : "achat"}<input className="mt-1 w-full rounded border p-2" defaultValue={target} name="target" required /></label><label>Montant<input className="mt-1 w-full rounded border p-2" min="0.01" name="amount" required step="0.01" type="number" /></label><label>Moyen<select className="mt-1 w-full rounded border p-2" defaultValue="" name="payment_method" required><option disabled value="">Sélectionner un moyen</option>{paymentOptions.map((option) => <option key={option.key} value={option.value}>{option.label}</option>)}</select></label><label>Référence<input className="mt-1 w-full rounded border p-2" maxLength={120} name="reference" /></label><label>Notes<textarea className="mt-1 w-full rounded border p-2" name="notes" /></label><button className="button button-primary sticky bottom-0 w-fit bg-white" disabled={saving || !hasAvailableMethod} type="submit">{saving ? "Enregistrement…" : "Enregistrer"}</button></form></Modal> : null}</div>; }
export function FinanceManager({ businessId, receivableId }: { businessId: string; receivableId?: string }) {
	const router = useRouter();
	const permissions = useBusinessPermissions(businessId);
	const canViewSummary = permissions?.includes("FINANCIAL_SUMMARY_VIEW") ?? false;
	const canViewMovements = permissions?.includes("FINANCIAL_MOVEMENT_VIEW") ?? false;
	const canViewReceivables = permissions?.includes("RECEIVABLE_VIEW") ?? false;
	const canViewPurchases = permissions?.includes("PURCHASE_VIEW") ?? false;
	const canCreateReceivablePayment = canCreateInvoicePayment(permissions);
	const canCreateSupplierPayment = permissions?.includes("SUPPLIER_PAYMENT_CREATE") ?? false;
	const canManageReceivables = canCreateReceivablePayment;
	const canManagePurchases = canCreateSupplierPayment;
	const [summary, setSummary] = useState<Summary | null>(null);
	const [receivables, setReceivables] = useState<Receivable[] | null>(null);
	const [purchases, setPurchases] = useState<Purchase[] | null>(null);
	const [movements, setMovements] = useState<Movement[] | null>(null);
	const [methodsByBusiness, setMethodsByBusiness] = useState<Record<string, Method[]>>({});
	const methods = paymentMethodsForBusiness(methodsByBusiness, businessId);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const load = useCallback(async () => {
		setError(null);
		try {
			const fetchResource = (allowed: boolean, resource: string) => allowed ? fetch(`/api/private/businesses/${businessId}/${resource}`, { credentials: "same-origin" }) : Promise.resolve(null);
			const [summaryResponse, movementsResponse, receivablesResponse, purchasesResponse, methodsResponse] = await Promise.all([
				fetchResource(canViewSummary, "financial-summary"), fetchResource(canViewMovements, "financial-movements"),
				fetchResource(canViewReceivables, "receivables"), fetchResource(canViewPurchases, "purchases"),
				fetchResource(canCreateReceivablePayment || canCreateSupplierPayment, "payment-methods"),
			]);
			const responses = [summaryResponse, movementsResponse, receivablesResponse, purchasesResponse, methodsResponse].filter((response): response is Response => response !== null);
			if (responses.some((response) => response.status === 401)) return router.replace("/connexion?erreur=session_expired");
			if (!responses.every((response) => response.ok)) return setError("Une ressource financière autorisée n’est pas accessible.");
			if (summaryResponse) setSummary((await summaryResponse.json() as { summary: Summary }).summary);
			if (movementsResponse) setMovements((await movementsResponse.json() as { movements: Movement[] }).movements);
			if (receivablesResponse) setReceivables((await receivablesResponse.json() as { receivables: Receivable[] }).receivables);
			if (purchasesResponse) setPurchases((await purchasesResponse.json() as { purchases: Purchase[] }).purchases);
			if (methodsResponse) {
				const loadedMethods = (await methodsResponse.json() as { paymentMethods: Method[] }).paymentMethods;
				setMethodsByBusiness((current) => ({ ...current, [businessId]: loadedMethods }));
			}
		} catch {
			setError("Les données financières sont temporairement indisponibles.");
		}
	}, [businessId, canCreateReceivablePayment, canCreateSupplierPayment, canViewMovements, canViewPurchases, canViewReceivables, canViewSummary, router]);

	useEffect(() => { if (permissions) startTransition(() => { void load(); }); }, [permissions, load]);

	return <main><p className="eyebrow">FINANCE</p><h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">Situation financière</h1>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{success ? <p className="mt-4 text-sm text-green-800" role="status">{success}</p> : null}{summary ? <section className="content-panel mt-5 grid gap-2 p-5 sm:grid-cols-3"><p>Encaissements : <strong>{summary.total_inflow} {summary.currency}</strong></p><p>Décaissements : <strong>{summary.total_outflow} {summary.currency}</strong></p><p>Flux net : <strong>{summary.net_flow} {summary.currency}</strong></p></section> : <p className="mt-5">Chargement…</p>}<div className="mt-6 flex flex-wrap gap-3">{canManageReceivables ? <PaymentForm allowed businessId={businessId} kind="receivable" methods={methods} onSaved={() => { setSuccess("Règlement client enregistré."); void load(); }} target={receivableId} /> : null}{canManagePurchases ? <PaymentForm allowed businessId={businessId} kind="purchase" onSaved={() => { setSuccess("Paiement fournisseur enregistré."); void load(); }} /> : null}</div><div className="mt-6 grid gap-6 xl:grid-cols-2"><section className="content-panel p-5"><h2 className="font-semibold">Créances clients</h2>{receivables?.length ? <ul className="mt-3 divide-y">{receivables.map((entry) => <li className="py-2" key={entry.public_id}>{entry.public_id} · solde {entry.balance} {entry.currency} · {entry.status}{entry.is_overdue ? " · Échue" : ""}</li>)}</ul> : <p className="mt-3 text-sm">Aucune créance.</p>}</section><section className="content-panel p-5"><h2 className="font-semibold">Dettes fournisseurs</h2>{purchases?.filter((entry) => entry.balance !== "0.00").length ? <ul className="mt-3 divide-y">{purchases.filter((entry) => entry.balance !== "0.00").map((entry) => <li className="py-2" key={entry.public_id}>{entry.public_id} · solde {entry.balance} {entry.currency} · {entry.payment_status}</li>)}</ul> : <p className="mt-3 text-sm">Aucune dette.</p>}</section><section className="content-panel p-5"><h2 className="font-semibold">Moyens de paiement</h2>{methods.length ? <ul className="mt-3 divide-y">{methods.map((method) => <li className="py-2" key={method.public_id}>{method.name} · {method.category}{method.is_active ? "" : " · Inactif"}</li>)}</ul> : <p className="mt-3 text-sm">Aucun moyen.</p>}</section><section className="content-panel p-5"><h2 className="font-semibold">Historique financier</h2>{movements?.length ? <ul className="mt-3 divide-y">{movements.map((movement) => <li className="py-2" key={movement.public_id}>{movement.direction} · {movement.amount} {movement.currency} · {movement.event_type}</li>)}</ul> : <p className="mt-3 text-sm">Aucune écriture.</p>}</section></div></main>;
}
