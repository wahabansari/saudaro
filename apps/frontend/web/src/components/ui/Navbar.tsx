import clsx from 'clsx';
import Link from 'next/link';
import type { ComponentProps } from 'react';

export type NavbarLink = { label: string; href: string; current?: boolean };

export type NavbarProps = ComponentProps<'header'> & {
  links: NavbarLink[];
};

export function Navbar({ links, className, children, ...props }: NavbarProps) {
  return (
    <header className={clsx('sa-nav', className)} {...props}>
      <img src="/brand/saudaro-lockup-horizontal-navy.svg" alt="SAUDARO" width={110} height={30} />
      <nav aria-label="Primary" className="flex gap-5">
        {links.map((link) => (
          <Link
            key={link.href}
            className="sa-nav__link"
            href={link.href}
            aria-current={link.current ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <span className="flex-1" />
      {children}
    </header>
  );
}
