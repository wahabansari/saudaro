import clsx from 'clsx';
import Link from 'next/link';
import { Fragment, type ComponentProps } from 'react';
import { Icon, type IconName } from '@/icons';

export type SidebarItem = {
  label: string;
  title?: string;
  href: string;
  icon: IconName;
  count?: number;
  current?: boolean;
};

export type SidebarGroup = { label: string; items: SidebarItem[] };

export type SidebarUser = { initials: string; name: string; role: string };

export type SidebarProps = ComponentProps<'aside'> & {
  groups: SidebarGroup[];
  user: SidebarUser;
  rail?: boolean;
  onCollapse?: () => void;
};

export function Sidebar({ groups, user, rail = false, onCollapse, className, ...props }: SidebarProps) {
  return (
    <aside className={clsx('sa-side', rail && 'sa-side--rail', className)} {...props}>
      <div className="sa-side__top">
        {rail ? (
          <img src="/brand/saudaro-mark-navy.svg" alt="SAUDARO" width={30} height={30} />
        ) : (
          <img src="/brand/saudaro-lockup-horizontal-navy.svg" alt="SAUDARO" width={110} height={30} />
        )}
        {onCollapse ? (
          <button
            type="button"
            className="sa-iconbtn sa-iconbtn--sm sa-side__txt"
            aria-label="Collapse sidebar"
            style={{ flex: 'none' }}
            onClick={onCollapse}
          >
            <Icon name="sidebar" size={20} />
          </button>
        ) : null}
      </div>
      <nav className="sa-side__nav" aria-label="Main">
        {groups.map((group) => (
          <Fragment key={group.label}>
            <span className="sa-side__label">{group.label}</span>
            {group.items.map((item) => (
              <Link
                key={item.href}
                className="sa-side__item"
                href={item.href}
                aria-current={item.current ? 'page' : undefined}
                title={item.title ?? item.label}
              >
                <Icon name={item.icon} size={20} />
                <span className="sa-side__txt">{item.label}</span>
                {item.count === undefined ? null : (
                  <span className="sa-badge sa-badge--info">{item.count}</span>
                )}
              </Link>
            ))}
          </Fragment>
        ))}
      </nav>
      <div className="sa-side__user">
        <span className="sa-avatar">{user.initials}</span>
        <div>
          <strong>{user.name}</strong>
          <span>{user.role}</span>
        </div>
      </div>
    </aside>
  );
}
