'use client';

import * as M from '@radix-ui/react-dropdown-menu';
import clsx from 'clsx';
import type { ComponentProps } from 'react';
import { Icon, type IconName } from '@/icons';

const ITEM = 'sa-menu__item data-[highlighted]:bg-grey-100 data-[highlighted]:outline-none';
const LINKS: [IconName, string][] = [
  ['user', 'Profile'],
  ['gear', 'Settings'],
  ['question', 'Help centre'],
];

export type UserMenuProps = ComponentProps<'button'> & {
  name: string;
  email: string;
  onSignOut?: () => void;
};

export function UserMenu({ name, email, onSignOut, className, ...props }: UserMenuProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <M.Root>
      <M.Trigger
        className={clsx(
          'sa-iconbtn !h-10 !w-10 !rounded-full data-[state=closed]:![animation:none]',
          className,
        )}
        aria-label={`Account menu ${initials}`}
        {...props}
      >
        <span className="sa-avatar">{initials}</span>
      </M.Trigger>
      <M.Portal>
        <M.Content
          align="end"
          sideOffset={6}
          collisionPadding={16}
          className="sa-menu sa-menu--lg z-toast max-w-[calc(100vw-2rem)] overflow-y-auto"
        >
          <div className="sa-menu__head" role="presentation">
            <span className="sa-avatar">{initials}</span>
            <div className="min-w-0">
              <strong className="truncate">{name}</strong>
              <span className="truncate">{email}</span>
            </div>
          </div>
          <M.Item className={ITEM}>
            <Icon name="building" size={20} />
            Switch organisation
            <span className="sa-menu__end">
              <Icon name="chevron-right" size={20} />
            </span>
          </M.Item>
          {LINKS.map(([icon, label]) => (
            <M.Item key={label} className={ITEM}>
              <Icon name={icon} size={20} />
              {label}
            </M.Item>
          ))}
          <M.Separator className="sa-menu__sep" />
          <M.Item className={ITEM} onSelect={onSignOut}>
            <Icon name="sign-out" size={20} />
            Sign out
          </M.Item>
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
