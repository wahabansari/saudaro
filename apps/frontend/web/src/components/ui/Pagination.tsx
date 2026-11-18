import clsx from 'clsx';
import Link from 'next/link';
import type { ComponentProps } from 'react';

export type PaginationProps = Omit<ComponentProps<'nav'>, 'children'> & {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
};

type PageItem = number | 'gap-before' | 'gap-after';

const DISABLED = 'pointer-events-none border-grey-200 bg-grey-100 text-grey-500';

function visiblePages(page: number, pageCount: number): PageItem[] {
  const shown = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);
  return shown.flatMap((n, i): PageItem[] => {
    const previous = shown[i - 1];
    const gap = previous === undefined ? 1 : n - previous;
    if (gap === 1) return [n];
    return gap === 2 ? [n - 1, n] : [i === 1 ? 'gap-before' : 'gap-after', n];
  });
}

export function Pagination({ page, pageCount, hrefFor, className, ...props }: PaginationProps) {
  const hasPrevious = page > 1;
  const hasNext = page < pageCount;
  return (
    <nav aria-label="Pagination" className={className} {...props}>
      <ul className="sa-pager">
        <li>
          {hasPrevious ? (
            <Link className="sa-page" href={hrefFor(page - 1)} aria-label="Previous">
              ‹
            </Link>
          ) : (
            <span className={clsx('sa-page', DISABLED)} aria-label="Previous" aria-disabled="true">
              ‹
            </span>
          )}
        </li>
        {visiblePages(page, pageCount).map((item) => (
          <li key={item}>
            {typeof item === 'string' ? (
              <span className="sa-page">…</span>
            ) : (
              <Link
                className="sa-page"
                href={hrefFor(item)}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </Link>
            )}
          </li>
        ))}
        <li>
          {hasNext ? (
            <Link className="sa-page" href={hrefFor(page + 1)} aria-label="Next">
              ›
            </Link>
          ) : (
            <span className={clsx('sa-page', DISABLED)} aria-label="Next" aria-disabled="true">
              ›
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
