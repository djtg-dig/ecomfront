"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatQuantityWithUnit } from "@/lib/quantities/format";
import styles from "./commercial-document-print.module.css";

type Sale = {
  public_id: string;
  customer_name_snapshot: string;
  operation_type: "DIRECT_SALE" | "INVOICE";
  invoice_number: string;
  status: "DRAFT" | "COMPLETED" | "CANCELLED";
  currency: string;
  reference: string;
  due_date?: string | null;
  total: string;
  paid_amount: string;
  balance: string;
  payment_status: string;
  created_at?: string;
  issued_at?: string | null;
  completed_at?: string | null;
  payment_records?: PaymentRecord[];
};
type Line = { public_id: string; item_name_snapshot: string; sku_snapshot: string; unit_symbol_snapshot: string; allows_decimal_quantity: boolean; quantity: string; unit_price: string; line_total: string };
type PaymentRecord = { amount: string; currency: string; method_name: string; occurred_at: string };
type Business = { name: string; address: string; zone: string; phone: string };
type Media = { secure_url: string } | null;
type SaleReturn = { public_id: string; return_total: string; refund_amount: string; returned_at: string };

const money = (value: string, currency: string, locale: string) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));
const dateTime = (value: string | null | undefined, locale: string) => value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const paymentStatus = (sale: Sale, locale: string) => {
  if (sale.status === "DRAFT") return locale === "fr" ? "BROUILLON" : "DRAFT";
  if (sale.operation_type === "DIRECT_SALE" || sale.payment_status === "PAID") return locale === "fr" ? "Payé" : "Paid";
  if (sale.payment_status === "PARTIALLY_PAID") return locale === "fr" ? "Partiellement réglée" : "Partially paid";
  return locale === "fr" ? "Impayée" : "Unpaid";
};

/** Aperçu imprimable fondé uniquement sur les instantanés et encaissements confirmés. */
export function CommercialDocumentPrint({ businessId, locale, sale, lines }: { businessId: string; locale: string; sale: Sale; lines: Line[] }) {
  const [open, setOpen] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [logo, setLogo] = useState<Media>(null);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [ticketWidth, setTicketWidth] = useState<"80" | "58">("80");
  const isInvoice = sale.operation_type === "INVOICE";

  useEffect(() => {
    if (!open) return;
    let active = true;
    void Promise.all([
      fetch(`/api/private/businesses/${businessId}`, { credentials: "same-origin" }),
      fetch(`/api/private/businesses/${businessId}/media/logo`, { credentials: "same-origin" }),
      fetch(`/api/private/businesses/${businessId}/sales/${sale.public_id}/returns`, { credentials: "same-origin" }),
    ]).then(async ([businessResponse, logoResponse, returnsResponse]) => {
      if (!active) return;
      if (businessResponse.ok) setBusiness(((await businessResponse.json()) as { business: Business }).business);
      if (logoResponse.ok) setLogo(((await logoResponse.json()) as { media: Media }).media);
      if (returnsResponse.ok) setReturns(((await returnsResponse.json()) as { returns: SaleReturn[] }).returns);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [businessId, open, sale.public_id]);

  const documentTitle = isInvoice ? locale === "fr" ? "Facture commerciale" : "Commercial invoice" : locale === "fr" ? "Ticket de caisse" : "Sales receipt";
  const reference = sale.invoice_number || sale.reference || sale.public_id;
  const printedDate = sale.issued_at || sale.completed_at || sale.created_at;

  return <><button className="button button-outline min-h-11 inline-flex items-center gap-2" onClick={() => setOpen(true)} type="button"><Printer aria-hidden="true" size={17} />{locale === "fr" ? "Imprimer" : "Print"}</button>{open ? <Modal onClose={() => setOpen(false)} size="large" title={documentTitle}><section className="grid gap-4 p-1"><div className="no-print flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[var(--muted)]">{locale === "fr" ? "Utilisez l’impression du navigateur pour enregistrer aussi en PDF." : "Use your browser print dialog to save as PDF as well."}</p>{!isInvoice ? <label className="text-sm">{locale === "fr" ? "Largeur" : "Width"}<select className="ml-2 rounded border p-2" onChange={event => setTicketWidth(event.target.value as "80" | "58")} value={ticketWidth}><option value="80">80 mm</option><option value="58">58 mm</option></select></label> : null}</div><article className={`${styles.document} ${isInvoice ? styles.invoice : `${styles.ticket} ${ticketWidth === "58" ? styles.ticket58 : ""}`}`}><header className={styles.header}>{logo ? <img alt="" className={styles.logo} src={logo.secure_url} /> : null}<div><h2>{business?.name || "Carri Business"}</h2>{business?.address ? <p>{business.address}</p> : null}{business?.zone ? <p>{business.zone}</p> : null}{business?.phone ? <p>{business.phone}</p> : null}</div></header><div className={styles.title}><strong>{sale.status === "DRAFT" ? locale === "fr" ? "BROUILLON — NON DÉFINITIF" : "DRAFT — NOT FINAL" : documentTitle}</strong><span>{reference}</span></div><dl className={styles.metadata}><div><dt>{locale === "fr" ? "Date" : "Date"}</dt><dd>{dateTime(printedDate, locale)}</dd></div>{isInvoice ? <div><dt>{locale === "fr" ? "Client" : "Customer"}</dt><dd>{sale.customer_name_snapshot || "—"}</dd></div> : null}{isInvoice && sale.due_date ? <div><dt>{locale === "fr" ? "Échéance" : "Due date"}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(sale.due_date))}</dd></div> : null}</dl><table className={styles.lines}><thead><tr><th>{locale === "fr" ? "Article" : "Item"}</th><th>{locale === "fr" ? "Qté" : "Qty"}</th><th>{locale === "fr" ? "Prix" : "Price"}</th><th>{locale === "fr" ? "Total" : "Total"}</th></tr></thead><tbody>{lines.map(line => <tr key={line.public_id}><td>{line.item_name_snapshot || line.sku_snapshot}<small>{line.sku_snapshot}</small></td><td>{formatQuantityWithUnit(line.quantity, locale, line.allows_decimal_quantity, line.unit_symbol_snapshot)}</td><td>{money(line.unit_price, sale.currency, locale)}</td><td>{money(line.line_total, sale.currency, locale)}</td></tr>)}</tbody></table><dl className={styles.totals}><div><dt>{locale === "fr" ? "Total" : "Total"}</dt><dd>{money(sale.total, sale.currency, locale)}</dd></div>{isInvoice ? <><div><dt>{locale === "fr" ? "Déjà réglé" : "Paid"}</dt><dd>{money(sale.paid_amount, sale.currency, locale)}</dd></div><div><dt>{locale === "fr" ? "Solde restant" : "Balance"}</dt><dd>{money(sale.balance, sale.currency, locale)}</dd></div></> : null}<div><dt>{locale === "fr" ? "Statut" : "Status"}</dt><dd>{paymentStatus(sale, locale)}</dd></div></dl>{sale.payment_records?.length ? <section className={styles.payments}><h3>{locale === "fr" ? "Règlements confirmés" : "Confirmed payments"}</h3><ul>{sale.payment_records.map((payment, index) => <li key={`${payment.occurred_at}-${index}`}><span>{payment.method_name} · {dateTime(payment.occurred_at, locale)}</span><strong>{money(payment.amount, payment.currency, locale)}</strong></li>)}</ul></section> : sale.status === "COMPLETED" ? <p className={styles.notice}>{locale === "fr" ? "Règlement confirmé." : "Payment confirmed."}</p> : null}{returns.length ? <section className={styles.returns}><h3>{locale === "fr" ? "Retours et remboursements" : "Returns and refunds"}</h3>{returns.map(entry => <p key={entry.public_id}>{dateTime(entry.returned_at, locale)} · {money(entry.return_total, sale.currency, locale)}{Number(entry.refund_amount) > 0 ? ` · ${locale === "fr" ? "Remboursé" : "Refunded"}: ${money(entry.refund_amount, sale.currency, locale)}` : ""}</p>)}</section> : null}</article><div className="no-print flex justify-end"><button className="button button-primary inline-flex min-h-11 items-center gap-2" onClick={() => window.print()} type="button"><Printer aria-hidden="true" size={17} />{locale === "fr" ? "Imprimer / Enregistrer en PDF" : "Print / Save as PDF"}</button></div></section></Modal> : null}</>;
}
