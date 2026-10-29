import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(resolve(process.cwd(), "src/components/sales/commercial-document-print.tsx"), "utf8");
const moduleCss = readFileSync(resolve(process.cwd(), "src/components/sales/commercial-document-print.module.css"), "utf8");
const globalCss = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

describe("documents commerciaux imprimables", () => {
  it("isole le document dans un portail déclaratif sans racine React indépendante", () => {
    expect(component).toContain("createPortal(");
    expect(component).toContain('className="commercial-document-print"');
    expect(component).not.toContain("createRoot(");
    expect(component).not.toContain("root.render(");
    expect(component).not.toContain("root.unmount(");
    expect(globalCss).toContain('body[data-commercial-printing] > :not(.commercial-document-print)');
    expect(globalCss).toContain("visibility: visible");
    expect(globalCss).not.toContain('body[data-commercial-printing] * { visibility: hidden');
  });

  it("conserve deux gabarits distincts pour A4 et thermique", () => {
    expect(component).toContain("function InvoiceDocument");
    expect(component).toContain("function TicketDocument");
    expect(component).toContain(`<table className={styles.invoiceLines}>`);
    expect(component).toContain(`<section className={styles.ticketItems}`);
    expect(component).not.toContain(`<table className={styles.ticketItems}>`);
  });

  it("dimensionne les pages A4, 80 mm et 58 mm et protège la pagination", () => {
    expect(component).toContain('"@page { size: A4 portrait; margin: 10mm; }"');
    expect(component).toContain("ticketPageHeightMm");
    expect(component).toContain('size: ${ticketWidth}mm ${ticketPageHeightMm}mm');
    expect(moduleCss).toContain("width: 80mm");
    expect(moduleCss).toContain("width: 58mm");
    expect(moduleCss).toContain("display: table-header-group");
    expect(moduleCss).toContain("break-inside: avoid");
    expect(moduleCss).toContain("overflow-wrap: anywhere");
  });

  it("imprime explicitement sans mutation métier ni fermeture automatique", () => {
    expect(component).toContain("window.print();");
    expect(component).toContain('window.addEventListener("afterprint", clearPrintMode)');
    expect(component).not.toContain('method: "POST"');
    expect(component).not.toContain("method: 'POST'");
    expect(component).not.toContain("setOpen(false);\n    window.print");
  });
});
