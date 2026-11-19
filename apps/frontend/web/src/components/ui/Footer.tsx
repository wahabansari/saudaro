import clsx from 'clsx';
import Link from 'next/link';
import type { ComponentProps } from 'react';

export type FooterProps = ComponentProps<'div'> & {
  description: string;
  columns: { href: string; label: string }[][];
};

export function Footer({ description, columns, className, ...props }: FooterProps) {
  return (
    <div className={clsx('@container', className)} {...props}>
      <footer className="sa-footer">
        <div className="flex flex-wrap items-start gap-8 @max-md:gap-6">
          <img
            src="/brand/saudaro-lockup-horizontal-navy.svg"
            alt="SAUDARO"
            width={110}
            height={30}
            className="block"
          />
          <span className="max-w-[36ch]">{description}</span>
          {columns.map((links) => (
            <span key={links[0]?.label} className="grid gap-2">
              {links.map(({ href, label }) => (
                <Link key={label} href={href}>
                  {label}
                </Link>
              ))}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
