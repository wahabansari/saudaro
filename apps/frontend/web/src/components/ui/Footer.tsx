import clsx from 'clsx';
import Link from 'next/link';
import type { ComponentProps } from 'react';

export type FooterLink = { label: string; href: string };

export type FooterProps = ComponentProps<'footer'> & {
  description: string;
  columns: FooterLink[][];
};

export function Footer({ description, columns, className, ...props }: FooterProps) {
  return (
    <footer className={clsx('sa-footer', className)} {...props}>
      <div className="flex flex-wrap items-start gap-8">
        <img src="/brand/saudaro-lockup-horizontal-navy.svg" alt="SAUDARO" width={110} height={30} />
        <span className="max-w-[36ch]">{description}</span>
        {columns.map((links) => (
          <span key={links.map((link) => link.href).join()} className="grid gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </span>
        ))}
      </div>
    </footer>
  );
}
