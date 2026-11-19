import clsx from 'clsx';
import Link from 'next/link';
import type { ComponentProps } from 'react';

export type BreadcrumbProps = ComponentProps<'div'> & {
  items: { label: string; href?: string }[];
};

export function Breadcrumb({ items, className, ...props }: BreadcrumbProps) {
  const last = items.length - 1;
  return (
    <div className={clsx('@container', className)} {...props}>
      <nav aria-label="Breadcrumb">
        <ol className="sa-crumb @max-md:flex-nowrap">
          {items.map(({ label, href }, i) => (
            <li
              key={label}
              aria-current={i === last ? 'page' : undefined}
              className={clsx(i > 0 && i < last && '@max-md:hidden', i === last && 'min-w-0 truncate')}
            >
              {i === last || !href ? label : <Link href={href}>{label}</Link>}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
