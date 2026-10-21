type PaginationControlsProps = {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  currentItemCount: number;
  itemLabel: string;
  ariaLabel: string;
  loading?: boolean;
  onPageChange: (page: number) => void;
};
import { useLocale } from "@/components/i18n/locale-provider";
import { formatMessage } from "@/lib/i18n/messages";

export function paginationItems(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 3) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 2) return [1, 2, 3];
  if (currentPage >= totalPages - 1) return [totalPages - 2, totalPages - 1, totalPages];
  return [currentPage - 1, currentPage, currentPage + 1];
}

export function paginationSearchParams(current: string, updates: Record<string, string | null>) {
  const params = new URLSearchParams(current);
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  return params;
}

export function PaginationControls({
  currentPage,
  totalItems,
  pageSize,
  currentItemCount,
  itemLabel,
  ariaLabel,
  loading = false,
  onPageChange,
}: PaginationControlsProps) {
  const { t } = useLocale();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = totalItems === 0 ? 0 : Math.min(firstItem + currentItemCount - 1, totalItems);

  return <nav aria-label={ariaLabel} className="mt-5 flex flex-wrap items-center gap-1.5 border-t pt-4 md:gap-2">
    <p aria-live="polite" className="basis-full text-sm text-[var(--muted)] md:mr-auto md:basis-auto">
      {formatMessage(t("pagination", "display"), { first: firstItem, last: lastItem, total: totalItems, items: itemLabel })}
    </p>
    {totalPages > 1 ? <>
      <button
        aria-label={t("pagination", "previous")}
        className="button button-outline min-w-9 px-2 text-lg font-bold"
        disabled={loading || currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        <span aria-hidden="true">&lt;</span>
      </button>
      {paginationItems(currentPage, totalPages).map((item) => <button
          aria-current={item === currentPage ? "page" : undefined}
          aria-label={formatMessage(t("pagination", "page"), { page: item })}
          className={`button min-w-10 px-2 ${item === currentPage ? "button-primary" : "button-outline"} hidden md:inline-flex`}
          disabled={loading || item === currentPage}
          key={item}
          onClick={() => onPageChange(item)}
          type="button"
        >{item}</button>)}
      <span aria-live="polite" className="min-w-14 text-center text-xs text-[var(--muted)] md:hidden">
        {currentPage} / {totalPages}
      </span>
      <button
        aria-label={t("pagination", "next")}
        className="button button-outline min-w-9 px-2 text-lg font-bold"
        disabled={loading || currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        <span aria-hidden="true">&gt;</span>
      </button>
    </> : null}
  </nav>;
}
