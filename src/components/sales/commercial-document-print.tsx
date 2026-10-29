"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

type Line = {
  public_id: string;
  item_name_snapshot: string;
  sku_snapshot: string;
  unit_symbol_snapshot: string;
  allows_decimal_quantity: boolean;
  quantity: string;
  unit_price: string;
  line_total: string;
};

type PaymentRecord = {
  amount: string;
  currency: string;
  method_name: string;
  occurred_at: string;
};

type Business = { name: string; address: string; zone: string; phone: string };
type Media = { secure_url: string } | null;
type SaleReturn = { public_id: string; return_total: string; refund_amount: string; returned_at: string };
type TicketWidth = "80" | "58";

type DocumentProps = {
  business: Business | null;
  isInvoice: boolean;
  lines: Line[];
  locale: string;
  logo: Media;
  reference: string;
  returns: SaleReturn[];
  sale: Sale;
  ticketWidth: TicketWidth;
};

const money = (value: string, currency: string, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));

const dateTime = (value: string | null | undefined, locale: string) =>
  value
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "—";

const dateOnly = (value: string | null | undefined, locale: string) =>
  value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value)) : "—";

const paymentStatus = (sale: Sale, locale: string) => {
  if (sale.status === "DRAFT") return locale === "fr" ? "Brouillon" : "Draft";
  if (sale.payment_status === "PAID" || sale.operation_type === "DIRECT_SALE") {
    return locale === "fr" ? "Payée" : "Paid";
  }
  if (sale.payment_status === "PARTIALLY_PAID") {
    return locale === "fr" ? "Partiellement payée" : "Partially paid";
  }
  return locale === "fr" ? "Impayée" : "Unpaid";
};

function BusinessIdentity({ business, logo, compact = false }: { business: Business | null; logo: Media; compact?: boolean }) {
  return (
    <header className={compact ? styles.ticketHeader : styles.invoiceHeader}>
      {logo ? (
        // The historical logo URL is already persisted by the media service and may use tenant-specific hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={business?.name ?? ""} className={compact ? styles.ticketLogo : styles.invoiceLogo} src={logo.secure_url} />
      ) : null}
      <div className={styles.businessIdentity}>
        <h2>{business?.name || "Carri Business"}</h2>
        {business?.address ? <p>{business.address}</p> : null}
        {business?.zone ? <p>{business.zone}</p> : null}
        {business?.phone ? <p>{business.phone}</p> : null}
      </div>
    </header>
  );
}

function InvoiceDocument({ business, lines, locale, logo, reference, returns, sale }: Omit<DocumentProps, "isInvoice" | "ticketWidth">) {
  const printedDate = sale.issued_at || sale.completed_at || sale.created_at;
  const isDraft = sale.status === "DRAFT";

  return (
    <article className={`${styles.document} ${styles.invoice}`} data-commercial-document="invoice">
      {isDraft ? <div aria-hidden="true" className={styles.draftWatermark}>{locale === "fr" ? "BROUILLON" : "DRAFT"}</div> : null}
      <BusinessIdentity business={business} logo={logo} />

      <section className={styles.invoiceHeading}>
        <div>
          <p className={styles.eyebrow}>{locale === "fr" ? "Document commercial" : "Commercial document"}</p>
          <h1>{locale === "fr" ? "Facture" : "Invoice"}</h1>
          {isDraft ? <p className={styles.draftNotice}>{locale === "fr" ? "BROUILLON — DOCUMENT NON DÉFINITIF" : "DRAFT — NOT A FINAL DOCUMENT"}</p> : null}
        </div>
        <dl className={styles.invoiceReference}>
          <div><dt>{locale === "fr" ? "Numéro" : "Number"}</dt><dd>{reference}</dd></div>
          <div><dt>{locale === "fr" ? "Date" : "Date"}</dt><dd>{dateTime(printedDate, locale)}</dd></div>
        </dl>
      </section>

      <section className={styles.parties}>
        <div>
          <p className={styles.sectionLabel}>{locale === "fr" ? "Facturé à" : "Bill to"}</p>
          <strong>{sale.customer_name_snapshot || (locale === "fr" ? "Client non renseigné" : "Customer not specified")}</strong>
        </div>
        <div>
          <p className={styles.sectionLabel}>{locale === "fr" ? "Échéance" : "Due date"}</p>
          <strong>{dateOnly(sale.due_date, locale)}</strong>
        </div>
        <div>
          <p className={styles.sectionLabel}>{locale === "fr" ? "Statut" : "Status"}</p>
          <strong className={styles.status}>{paymentStatus(sale, locale)}</strong>
        </div>
      </section>

      <table className={styles.invoiceLines}>
        <colgroup>
          <col className={styles.itemColumn} />
          <col className={styles.quantityColumn} />
          <col className={styles.moneyColumn} />
          <col className={styles.moneyColumn} />
        </colgroup>
        <thead>
          <tr>
            <th>{locale === "fr" ? "Article" : "Item"}</th>
            <th>{locale === "fr" ? "Quantité" : "Quantity"}</th>
            <th>{locale === "fr" ? "Prix unitaire" : "Unit price"}</th>
            <th>{locale === "fr" ? "Montant" : "Amount"}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.public_id}>
              <td><strong>{line.item_name_snapshot || line.sku_snapshot}</strong>{line.sku_snapshot ? <small>{line.sku_snapshot}</small> : null}</td>
              <td>{formatQuantityWithUnit(line.quantity, locale, line.allows_decimal_quantity, line.unit_symbol_snapshot)}</td>
              <td>{money(line.unit_price, sale.currency, locale)}</td>
              <td>{money(line.line_total, sale.currency, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className={styles.invoiceSummary}>
        <dl className={styles.summaryTotals}>
          <div><dt>{locale === "fr" ? "Total" : "Total"}</dt><dd>{money(sale.total, sale.currency, locale)}</dd></div>
          <div><dt>{locale === "fr" ? "Déjà payé" : "Paid"}</dt><dd>{money(sale.paid_amount, sale.currency, locale)}</dd></div>
          <div className={styles.balanceRow}><dt>{locale === "fr" ? "Solde restant" : "Balance due"}</dt><dd>{money(sale.balance, sale.currency, locale)}</dd></div>
        </dl>
      </section>

      <PaymentAndReturnDetails locale={locale} returns={returns} sale={sale} />
    </article>
  );
}

function TicketDocument({ business, lines, locale, logo, reference, returns, sale, ticketWidth }: Omit<DocumentProps, "isInvoice">) {
  const printedDate = sale.completed_at || sale.issued_at || sale.created_at;

  return (
    <article
      className={`${styles.document} ${styles.ticket} ${ticketWidth === "58" ? styles.ticket58 : styles.ticket80}`}
      data-commercial-document={`ticket-${ticketWidth}`}
    >
      <BusinessIdentity business={business} compact logo={logo} />
      <section className={styles.ticketReference}>
        <h1>{locale === "fr" ? "Ticket de caisse" : "Sales receipt"}</h1>
        <p><span>{locale === "fr" ? "Réf." : "Ref."}</span><strong>{reference}</strong></p>
        <p><span>{locale === "fr" ? "Date" : "Date"}</span><strong>{dateTime(printedDate, locale)}</strong></p>
      </section>

      <section className={styles.ticketItems} aria-label={locale === "fr" ? "Articles" : "Items"}>
        {lines.map((line) => (
          <article className={styles.ticketItem} key={line.public_id}>
            <strong className={styles.ticketItemName}>{line.item_name_snapshot || line.sku_snapshot}</strong>
            {line.sku_snapshot ? <small>{line.sku_snapshot}</small> : null}
            <div className={styles.ticketItemCalculation}>
              <span>{formatQuantityWithUnit(line.quantity, locale, line.allows_decimal_quantity, line.unit_symbol_snapshot)} × {money(line.unit_price, sale.currency, locale)}</span>
              <strong>{money(line.line_total, sale.currency, locale)}</strong>
            </div>
          </article>
        ))}
      </section>

      <dl className={styles.ticketTotals}>
        <div className={styles.ticketGrandTotal}><dt>{locale === "fr" ? "TOTAL" : "TOTAL"}</dt><dd>{money(sale.total, sale.currency, locale)}</dd></div>
        <div><dt>{locale === "fr" ? "Encaissé" : "Paid"}</dt><dd>{money(sale.paid_amount, sale.currency, locale)}</dd></div>
        {Number(sale.balance) > 0 ? <div><dt>{locale === "fr" ? "Solde" : "Balance"}</dt><dd>{money(sale.balance, sale.currency, locale)}</dd></div> : null}
      </dl>

      <PaymentAndReturnDetails compact locale={locale} returns={returns} sale={sale} />
      <footer className={styles.ticketFooter}>{locale === "fr" ? "Merci pour votre achat." : "Thank you for your purchase."}</footer>
    </article>
  );
}

function PaymentAndReturnDetails({ compact = false, locale, returns, sale }: { compact?: boolean; locale: string; returns: SaleReturn[]; sale: Sale }) {
  return (
    <div className={compact ? styles.ticketDetails : styles.invoiceDetails}>
      {sale.payment_records?.length ? (
        <section className={styles.payments}>
          <h3>{locale === "fr" ? "Paiements confirmés" : "Confirmed payments"}</h3>
          <ul>
            {sale.payment_records.map((payment, index) => (
              <li key={`${payment.occurred_at}-${index}`}>
                <span>{payment.method_name}<small>{dateTime(payment.occurred_at, locale)}</small></span>
                <strong>{money(payment.amount, payment.currency, locale)}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {returns.length ? (
        <section className={styles.returns}>
          <h3>{locale === "fr" ? "Retours et remboursements" : "Returns and refunds"}</h3>
          {returns.map((entry) => (
            <p key={entry.public_id}>
              <span>{dateTime(entry.returned_at, locale)}</span>
              <strong>{money(entry.return_total, sale.currency, locale)}</strong>
              {Number(entry.refund_amount) > 0 ? <small>{locale === "fr" ? "Remboursé" : "Refunded"}: {money(entry.refund_amount, sale.currency, locale)}</small> : null}
            </p>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function CommercialDocument(props: DocumentProps) {
  return props.isInvoice
    ? <InvoiceDocument {...props} />
    : <TicketDocument {...props} />;
}

/** Aperçu imprimable fondé uniquement sur les instantanés et encaissements confirmés. */
export function CommercialDocumentPrint({ businessId, locale, sale, lines }: { businessId: string; locale: string; sale: Sale; lines: Line[] }) {
  const [open, setOpen] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [logo, setLogo] = useState<Media>(null);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [ticketWidth, setTicketWidth] = useState<TicketWidth>("80");
  const [ticketPageHeightMm, setTicketPageHeightMm] = useState(160);
  const printPortalRef = useRef<HTMLDivElement>(null);
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

  const clearPrintMode = useCallback(() => {
    delete document.body.dataset.commercialPrinting;
  }, []);

  useEffect(() => {
    window.addEventListener("afterprint", clearPrintMode);
    return () => {
      window.removeEventListener("afterprint", clearPrintMode);
      clearPrintMode();
    };
  }, [clearPrintMode]);

  useLayoutEffect(() => {
    if (!open || isInvoice) return;
    const documentElement = printPortalRef.current?.querySelector<HTMLElement>("[data-commercial-document]");
    if (!documentElement) return;

    // CSS pixels use the 96 dpi reference pixel. Add the physical page margins
    // so Chrome can create a roll-sized PDF without a blank Letter/A4 tail.
    const marginMm = ticketWidth === "58" ? 1.5 : 2;
    const contentHeightMm = documentElement.getBoundingClientRect().height * 25.4 / 96;
    setTicketPageHeightMm(Math.max(60, Math.ceil(contentHeightMm + marginMm * 2)));
  }, [business, isInvoice, lines, logo, open, returns, ticketWidth]);

  const closePreview = () => {
    clearPrintMode();
    setOpen(false);
  };

  const printDocument = () => {
    document.body.dataset.commercialPrinting = isInvoice ? "invoice" : `ticket-${ticketWidth}`;
    window.print();
  };

  const documentTitle = isInvoice
    ? locale === "fr" ? "Facture commerciale" : "Commercial invoice"
    : locale === "fr" ? "Ticket de caisse" : "Sales receipt";
  const reference = sale.invoice_number || sale.reference || sale.public_id;
  const documentProps: DocumentProps = { business, isInvoice, lines, locale, logo, reference, returns, sale, ticketWidth };
  const pageStyle = isInvoice
    ? "@page { size: A4 portrait; margin: 10mm; }"
    : `@page { size: ${ticketWidth}mm ${ticketPageHeightMm}mm; margin: ${ticketWidth === "58" ? "1.5" : "2"}mm; }`;

  return (
    <>
      <button className="button button-outline min-h-11 inline-flex items-center gap-2" onClick={() => setOpen(true)} type="button">
        <Printer aria-hidden="true" size={17} />
        {locale === "fr" ? "Imprimer" : "Print"}
      </button>

      {open ? (
        <>
          <Modal onClose={closePreview} size="large" title={documentTitle}>
            <section className="grid gap-4 p-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--muted)]">
                  {locale === "fr" ? "Vérifiez l’aperçu, puis utilisez l’impression du navigateur pour imprimer ou enregistrer en PDF." : "Review the preview, then use your browser print dialog to print or save as PDF."}
                </p>
                {!isInvoice ? (
                  <label className="text-sm">
                    {locale === "fr" ? "Largeur" : "Width"}
                    <select className="ml-2 rounded border p-2" onChange={(event) => setTicketWidth(event.target.value as TicketWidth)} value={ticketWidth}>
                      <option value="80">80 mm</option>
                      <option value="58">58 mm</option>
                    </select>
                  </label>
                ) : null}
              </div>

              <div className={styles.preview}>
                <CommercialDocument {...documentProps} />
              </div>

              <div className="flex justify-end">
                <button className="button button-primary inline-flex min-h-11 items-center gap-2" onClick={printDocument} type="button">
                  <Printer aria-hidden="true" size={17} />
                  {locale === "fr" ? "Imprimer / Enregistrer en PDF" : "Print / Save as PDF"}
                </button>
              </div>
            </section>
          </Modal>

          {createPortal(
            <div aria-hidden="true" className="commercial-document-print" ref={printPortalRef}>
              <style media="print">{pageStyle}</style>
              <CommercialDocument {...documentProps} />
            </div>,
            document.body,
          )}
        </>
      ) : null}
    </>
  );
}
