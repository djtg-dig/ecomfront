"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";
type Receivable = { public_id: string; sale: string; customer: string; currency: string; original_amount: string; paid_amount: string; balance: string; status: string; is_overdue: boolean };
type Purchase = { public_id: string; supplier: string | null; currency: string; total: string; paid_amount: string; balance: string; payment_status: string; status: string };
type Movement = { public_id: string; direction: string; amount: string; currency: string; payment_method: string; event_type: string; occurred_at: string; reason: string };
type Summary = { currency: string; total_inflow: string; total_outflow: string; net_flow: string; by_payment_method: { payment_method: string; total_inflow: string; total_outflow: string; net_flow: string }[] };
type Method = { public_id: string; name: string; category: string; is_active: boolean };
const categories = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER", "CARD", "OTHER"];
async function message(response: Response) { try { return (await response.json() as { detail?: string }).detail ?? "Les données financières sont indisponibles."; } catch { return "Les données financières sont indisponibles."; } }
function PaymentForm({ businessId, kind, onSaved, allowed }: { businessId: string; kind: "receivable" | "purchase"; onSaved: () => void; allowed: boolean }) { const router = useRouter(); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null); const [open, setOpen] = useState(false); async function submit(form: HTMLFormElement) { setSaving(true); setError(null); const data = new FormData(form); const target = data.get("target")?.toString().trim(); const key = crypto.randomUUID(); const path = kind === "receivable" ? `/api/private/businesses/${businessId}/receivables/${target}/payments` : `/api/private/businesses/${businessId}/purchases/${target}/payments`; try { const response = await fetch(path, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1", "idempotency-key": key }, body: JSON.stringify({ amount: data.get("amount"), payment_method: data.get("payment_method"), reference: data.get("reference") || "", notes: data.get("notes") || "" }) }); if (response.status === 401) return router.replace("/connexion?erreur=session_expired"); if (!response.ok) return setError(await message(response)); form.reset(); setOpen(false); onSaved(); } catch { setError("Les données financières sont temporairement indisponibles."); } finally { setSaving(false); } } return <>{allowed ? <button className="button button-outline" onClick={() => setOpen(true)} type="button">{kind === "receivable" ? "Enregistrer un règlement client" : "Enregistrer un paiement fournisseur"}</button> : null}{open ? <Modal onClose={() => setOpen(false)} title={kind === "receivable" ? "Règlement client" : "Paiement fournisseur"}><form aria-busy={saving} className="grid gap-3 p-1" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}><p className="text-sm text-[var(--muted)]">Le solde et l’écriture financière sont validés par Django.</p>{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}<label>Identifiant {kind === "receivable" ? "créance" : "achat"}<input className="mt-1 w-full rounded border p-2" name="target" required /></label><label>Montant<input className="mt-1 w-full rounded border p-2" min="0.01" name="amount" required step="0.01" type="number" /></label><label>Moyen<select className="mt-1 w-full rounded border p-2" name="payment_method" required>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Référence<input className="mt-1 w-full rounded border p-2" maxLength={120} name="reference" /></label><label>Notes<textarea className="mt-1 w-full rounded border p-2" name="notes" /></label><button className="button button-primary sticky bottom-0 w-fit bg-white" disabled={saving} type="submit">{saving ? "Enregistrement…" : "Enregistrer"}</button></form></Modal> : null}</>; }
export function FinanceManager({ businessId }: { businessId: string }) {
	const router = useRouter();
	const permissions = useBusinessPermissions(businessId);
	const canManageReceivables = permissions?.includes("MANAGE_RECEIVABLES") ?? false;
	const canManagePurchases = permissions?.includes("MANAGE_PURCHASES") ?? false;
	const [summary, setSummary] = useState<Summary | null>(null);
	const [receivables, setReceivables] = useState<Receivable[] | null>(null);
	const [purchases, setPurchases] = useState<Purchase[] | null>(null);
	const [movements, setMovements] = useState<Movement[] | null>(null);
	const [methods, setMethods] = useState<Method[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	async function load() {
		setError(null);
		try {
			const requests = ["financial-summary", "financial-movements", "receivables", "purchases", "payment-methods"].map((resource) => fetch(`/api/private/businesses/${businessId}/${resource}`, { credentials: "same-origin" }));
			const [summaryResponse, movementsResponse, receivablesResponse, purchasesResponse, methodsResponse] = await Promise.all(requests);
			if ([summaryResponse, movementsResponse, receivablesResponse, purchasesResponse, methodsResponse].some((response) => response.status === 401)) return router.replace("/connexion?erreur=session_expired");
			if (![summaryResponse, movementsResponse, receivablesResponse, purchasesResponse, methodsResponse].every((response) => response.ok)) return setError("Une ressource financière n’est pas accessible.");
			setSummary((await summaryResponse.json() as { summary: Summary }).summary);
			setMovements((await movementsResponse.json() as { movements: Movement[] }).movements);
			setReceivables((await receivablesResponse.json() as { receivables: Receivable[] }).receivables);
			setPurchases((await purchasesResponse.json() as { purchases: Purchase[] }).purchases);
			setMethods((await methodsResponse.json() as { paymentMethods: Method[] }).paymentMethods);
		} catch {
			setError("Les données financières sont temporairement indisponibles.");
		}
	}

	useEffect(() => { void load(); }, [businessId]);

	return <main><p className="eyebrow">FINANCE</p><h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">Situation financière</h1>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{success ? <p className="mt-4 text-sm text-green-800" role="status">{success}</p> : null}{summary ? <section className="content-panel mt-5 grid gap-2 p-5 sm:grid-cols-3"><p>Encaissements : <strong>{summary.total_inflow} {summary.currency}</strong></p><p>Décaissements : <strong>{summary.total_outflow} {summary.currency}</strong></p><p>Flux net : <strong>{summary.net_flow} {summary.currency}</strong></p></section> : <p className="mt-5">Chargement…</p>}<div className="mt-6 flex flex-wrap gap-3">{canManageReceivables ? <PaymentForm allowed businessId={businessId} kind="receivable" onSaved={() => { setSuccess("Règlement client enregistré."); void load(); }} /> : null}{canManagePurchases ? <PaymentForm allowed businessId={businessId} kind="purchase" onSaved={() => { setSuccess("Paiement fournisseur enregistré."); void load(); }} /> : null}</div><div className="mt-6 grid gap-6 xl:grid-cols-2"><section className="content-panel p-5"><h2 className="font-semibold">Créances clients</h2>{receivables?.length ? <ul className="mt-3 divide-y">{receivables.map((entry) => <li className="py-2" key={entry.public_id}>{entry.public_id} · solde {entry.balance} {entry.currency} · {entry.status}{entry.is_overdue ? " · Échue" : ""}</li>)}</ul> : <p className="mt-3 text-sm">Aucune créance.</p>}</section><section className="content-panel p-5"><h2 className="font-semibold">Dettes fournisseurs</h2>{purchases?.filter((entry) => entry.balance !== "0.00").length ? <ul className="mt-3 divide-y">{purchases.filter((entry) => entry.balance !== "0.00").map((entry) => <li className="py-2" key={entry.public_id}>{entry.public_id} · solde {entry.balance} {entry.currency} · {entry.payment_status}</li>)}</ul> : <p className="mt-3 text-sm">Aucune dette.</p>}</section><section className="content-panel p-5"><h2 className="font-semibold">Moyens de paiement</h2>{methods.length ? <ul className="mt-3 divide-y">{methods.map((method) => <li className="py-2" key={method.public_id}>{method.name} · {method.category}{method.is_active ? "" : " · Inactif"}</li>)}</ul> : <p className="mt-3 text-sm">Aucun moyen.</p>}</section><section className="content-panel p-5"><h2 className="font-semibold">Historique financier</h2>{movements?.length ? <ul className="mt-3 divide-y">{movements.map((movement) => <li className="py-2" key={movement.public_id}>{movement.direction} · {movement.amount} {movement.currency} · {movement.event_type}</li>)}</ul> : <p className="mt-3 text-sm">Aucune écriture.</p>}</section></div></main>;
}
