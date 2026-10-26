import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PaginationControls, paginationItems, paginationSearchParams } from "@/components/ui/pagination-controls";
import { LocaleProvider } from "@/components/i18n/locale-provider";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const renderPagination = (component: React.ReactNode) => renderToStaticMarkup(<LocaleProvider initialLocale="fr">{component}</LocaleProvider>);

describe("PaginationControls", () => {
  it("affiche 15 pages et le total filtré pour 148 produits", () => {
    const html = renderPagination(<PaginationControls
      ariaLabel="Pagination de l’inventaire"
      currentItemCount={10}
      currentPage={1}
      itemLabel="produits"
      onPageChange={vi.fn()}
      pageSize={10}
      totalItems={148}
    />);

    expect(html).toContain("Affichage de 1 à 10 sur 148 produits");
    expect(html).toContain('aria-label="Page 3"');
    expect(html).toContain('aria-label="Page précédente"');
    expect(html).toContain('aria-label="Page suivante"');
    expect(paginationItems(1, 15)).toEqual([1, 2, 3]);
  });

  it("distingue la page active et désactive les boutons aux limites", () => {
    const firstPage = renderPagination(<PaginationControls ariaLabel="Pagination" currentItemCount={10} currentPage={1} itemLabel="produits" onPageChange={vi.fn()} pageSize={10} totalItems={148} />);
    const lastPage = renderPagination(<PaginationControls ariaLabel="Pagination" currentItemCount={8} currentPage={15} itemLabel="produits" onPageChange={vi.fn()} pageSize={10} totalItems={148} />);

    expect(firstPage).toMatch(/aria-label="Page précédente"[^>]*disabled/);
    expect(firstPage).toContain('aria-current="page"');
    expect(lastPage).toMatch(/aria-label="Page suivante"[^>]*disabled/);
    expect(lastPage).toContain("Affichage de 141 à 148 sur 148 produits");
  });

  it("conserve l’indication du total et masque les boutons sur une seule page", () => {
    const html = renderPagination(<PaginationControls ariaLabel="Pagination de l’historique" currentItemCount={7} currentPage={1} itemLabel="mouvements" onPageChange={vi.fn()} pageSize={10} totalItems={7} />);

    expect(html).toContain("Affichage de 1 à 7 sur 7 mouvements");
    expect(html).not.toContain('aria-label="Page suivante"');
    expect(html).not.toContain('aria-label="Page précédente"');
  });

  it("calcule des numéros compacts autour de la page courante", () => {
    expect(paginationItems(8, 15)).toEqual([7, 8, 9]);
    expect(paginationItems(15, 15)).toEqual([13, 14, 15]);
  });

  it("rend indépendamment la page courante de chaque tableau", () => {
    const inventory = renderPagination(<PaginationControls ariaLabel="Inventaire" currentItemCount={10} currentPage={2} itemLabel="produits" onPageChange={vi.fn()} pageSize={10} totalItems={148} />);
    const movements = renderPagination(<PaginationControls ariaLabel="Historique" currentItemCount={10} currentPage={3} itemLabel="mouvements" onPageChange={vi.fn()} pageSize={10} totalItems={72} />);

    expect(inventory).toContain('aria-label="Page 2"');
    expect(inventory).toContain('aria-current="page"');
    expect(movements).toContain('aria-label="Page 3"');
    expect(movements).toContain('aria-current="page"');
  });

  it("préserve les filtres et l’autre pagination dans l’URL", () => {
    const next = paginationSearchParams("q=café&status=LOW_STOCK&movements_page=3&inventory_page=2", { inventory_page: "4" });
    expect(next.get("q")).toBe("café");
    expect(next.get("status")).toBe("LOW_STOCK");
    expect(next.get("movements_page")).toBe("3");
    expect(next.get("inventory_page")).toBe("4");

    const resetMovements = paginationSearchParams(next.toString(), { type: "SALE", movements_page: null });
    expect(resetMovements.get("inventory_page")).toBe("4");
    expect(resetMovements.get("movements_page")).toBeNull();
    expect(resetMovements.get("type")).toBe("SALE");
  });
});
