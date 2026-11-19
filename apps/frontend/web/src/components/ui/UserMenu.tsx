'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import clsx from 'clsx';
import type { ComponentProps } from 'react';
import { Icon, type IconName } from '@/icons';

export type UserMenuAction = 'organisation' | 'profile' | 'settings' | 'help' | 'sign-out';

export type UserMenuProps = Omit<ComponentProps<'button'>, 'children'> & {
  name: string;
  email: string;
  initials: string;
  open?: boolean;
  container?: HTMLElement;
  onAction?: (action: UserMenuAction) => void;
};

type Entry = { action: UserMenuAction; icon: IconName; label: string };

const ITEM = 'sa-menu__item [animation:sa-item-in_340ms_var(--ease-pop)_both]';
const ENTRIES: Entry[] = [
  { action: 'organisation', icon: 'building', label: 'Switch organisation' },
  { action: 'profile', icon: 'user', label: 'Profile' },
  { action: 'settings', icon: 'gear', label: 'Settings' },
  { action: 'help', icon: 'question', label: 'Help centre' },
];
const SIGN_OUT: Entry = { action: 'sign-out', icon: 'sign-out', label: 'Sign out' };

type ItemProps = { entry: Entry; onAction?: (action: UserMenuAction) => void };

function Item({ entry, onAction }: ItemProps) {
  return (
    <DropdownMenuPrimitive.Item className={ITEM} onSelect={() => onAction?.(entry.action)}>
      <Icon name={entry.icon} size={20} />
      {entry.label}
      {entry.action === 'organisation' ? (
        <span className="sa-menu__end">
          <Icon name="chevron-right" size={20} />
        </span>
      ) : null}
    </DropdownMenuPrimitive.Item>
  );
}

export function UserMenu({
  name,
  email,
  initials,
  open,
  container,
  onAction,
  className,
  ...props
}: UserMenuProps) {
  return (
    <DropdownMenuPrimitive.Root open={open} modal={!container}>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`${initials} Account menu`}
          {...props}
          className={clsx('sa-iconbtn rounded-full data-[state=closed]:![animation:none]', className)}
        >
          <span className="sa-avatar">{initials}</span>
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal container={container}>
        <DropdownMenuPrimitive.Content
          className="sa-menu sa-menu--lg z-dropdown [--pop-origin:var(--radix-dropdown-menu-content-transform-origin)]"
          sideOffset={6}
          align="end"
        >
          <div className="sa-menu__head" role="presentation">
            <span className="sa-avatar">{initials}</span>
            <div>
              <strong>{name}</strong>
              <span>{email}</span>
            </div>
          </div>
          {ENTRIES.map((entry) => (
            <Item key={entry.action} entry={entry} onAction={onAction} />
          ))}
          <DropdownMenuPrimitive.Separator className="sa-menu__sep" />
          <Item entry={SIGN_OUT} onAction={onAction} />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
