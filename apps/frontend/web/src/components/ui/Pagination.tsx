import clsx from 'clsx';
import Link from 'next/link';
import { Fragment, type ComponentProps } from 'react';

export type PaginationProps = ComponentProps<'div'> & {
  page: number;
  total: number;
  href: (page: number) => string;
};

export function Pagination({ page, total, href, className, ...props }: PaginationProps) {
  const shown = [...new Set([1, page - 1, page, page + 1, total])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const clamp = (n: number) => Math.min(Math.max(n, 1), total);
  return (
    <div className={clsx('@container', className)} {...props}>
      <nav aria-label="Pagination">
        <ul className="sa-pager">
          <li>
            <Link className="sa-page" href={href(clamp(page - 1))} aria-label="Previous">
              ‹
            </Link>
          </li>
          {shown.map((n, i) => (
            <Fragment key={n}>
              {i > 0 && n - (shown[i - 1] ?? n) > 1 && (
                <li className="@max-sm:hidden">
                  <span className="sa-page">…</span>
                </li>
              )}
              <li className={clsx(n !== 1 && n !== total && n !== page && '@max-sm:hidden')}>
                <Link className="sa-page" href={href(n)} aria-current={n === page ? 'page' : undefined}>
                  {n}
                </Link>
              </li>
            </Fragment>
          ))}
          <li>
            <Link className="sa-page" href={href(clamp(page + 1))} aria-label="Next">
              ›
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
