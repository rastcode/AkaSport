"use client";

/** Accessible pagination control styled with the brand palette. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-1"
    >
      <PageButton
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        ariaLabel="Previous page"
      >
        ‹
      </PageButton>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-silver">
            …
          </span>
        ) : (
          <PageButton
            key={p}
            active={p === page}
            onClick={() => onPageChange(p)}
            ariaLabel={`Page ${p}`}
            ariaCurrent={p === page}
          >
            {p}
          </PageButton>
        ),
      )}

      <PageButton
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        ariaLabel="Next page"
      >
        ›
      </PageButton>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  active = false,
  disabled = false,
  ariaLabel,
  ariaCurrent = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  ariaCurrent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent ? "page" : undefined}
      className={
        "flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors " +
        (active
          ? "bg-bondi-blue text-white"
          : "border border-silver bg-white text-blue-slate hover:border-bondi-blue hover:text-bondi-blue") +
        (disabled ? " cursor-not-allowed opacity-40 hover:border-silver" : "")
      }
    >
      {children}
    </button>
  );
}

/** Build a compact page list with ellipses, e.g. [1, …, 4, 5, 6, …, 12]. */
function buildPageList(current: number, total: number): (number | "…")[] {
  const delta = 1;
  const range: (number | "…")[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1);
  if (left > 2) range.push("…");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push("…");
  if (total > 1) range.push(total);

  return range;
}
