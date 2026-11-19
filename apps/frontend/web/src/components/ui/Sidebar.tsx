'use client';

import clsx from 'clsx';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { Icon, type IconName } from '@/icons';

type Item = { href: string; label: string; icon: IconName; badge?: number; current?: boolean };

export type SidebarProps = ComponentProps<'div'> & {
  sections: { label: string; items: Item[] }[];
  user: { initials: string; name: string; role: string };
  rail?: boolean;
  onToggle?: () => void;
};

export function Sidebar({ sections, user, rail, onToggle, className, ...props }: SidebarProps) {
  return (
    <div className={clsx('@container', rail ? 'w-[72px]' : 'w-[264px]', className)} {...props}>
      <aside className={clsx('sa-side !h-full !w-full', rail && 'sa-side--rail')}>
        <div className="sa-side__top">
          <img
            src={`/brand/saudaro-${rail ? 'mark' : 'lockup-horizontal'}-navy.svg`}
            alt="SAUDARO"
            width={rail ? 30 : 110}
            height={30}
          />
          <button
            type="button"
            className="sa-iconbtn sa-iconbtn--sm sa-side__txt"
            aria-label="Collapse sidebar"
            style={{ flex: 'none' }}
            onClick={onToggle}
          >
            <Icon name="sidebar" />
          </button>
        </div>
        <nav className="sa-side__nav" aria-label="Main">
          {sections.flatMap((section) => [
            <span key={section.label} className="sa-side__label">
              {section.label}
            </span>,
            ...section.items.map(({ href, label, icon, badge, current }) => (
              <Link
                key={label}
                href={href}
                className="sa-side__item"
                title={label}
                aria-current={current ? 'page' : undefined}
              >
                <Icon name={icon} />
                <span className="sa-side__txt">{label}</span>
                {badge !== undefined && <span className="sa-badge sa-badge--info">{badge}</span>}
              </Link>
            )),
          ])}
        </nav>
        <div className="sa-side__user">
          <span className="sa-avatar">{user.initials}</span>
          <div>
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
