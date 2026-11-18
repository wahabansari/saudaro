import Link from 'next/link';
import type { ComponentProps } from 'react';

export type BreadcrumbProps = Omit<ComponentProps<'nav'>, 'children'> & {
  items: { label: string; href: string }[];
  current: string;
};

export function Breadcrumb({ items, current, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" {...props}>
      <ol className="sa-crumb">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}
