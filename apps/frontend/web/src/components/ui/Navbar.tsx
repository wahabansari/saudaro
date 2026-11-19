import clsx from 'clsx';
import Link from 'next/link';
import type { ComponentProps } from 'react';

export type NavbarProps = ComponentProps<'div'> & {
  links: { href: string; label: string; current?: boolean }[];
};

export function Navbar({ links, className, children, ...props }: NavbarProps) {
  return (
    <div className={clsx('@container', className)} {...props}>
      <header className="sa-nav">
        <img
          src="/brand/saudaro-lockup-horizontal-navy.svg"
          alt="SAUDARO"
          width={124}
          height={34}
          className="block w-auto"
        />
        <nav aria-label="Primary" className="flex gap-5 @max-xs:hidden">
          {links.map(({ href, label, current }) => (
            <Link key={href} href={href} className="sa-nav__link" aria-current={current ? 'page' : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <span className="flex-1" />
        {children}
      </header>
    </div>
  );
}
