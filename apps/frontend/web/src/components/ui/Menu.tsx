'use client';

import * as M from '@radix-ui/react-dropdown-menu';
import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';
import { Icon, type IconName } from '@/icons';

export { RadioGroup as MenuRadioGroup } from '@radix-ui/react-dropdown-menu';

const ITEM = 'sa-menu__item data-[highlighted]:bg-grey-100 data-[highlighted]:outline-none';

export type MenuProps = ComponentProps<typeof M.Content> & { trigger: ReactNode };

export function Menu({ trigger, className, children, ...props }: MenuProps) {
  return (
    <M.Root>
      <M.Trigger asChild className="data-[state=closed]:![animation:none]">
        {trigger}
      </M.Trigger>
      <M.Portal>
        <M.Content
          sideOffset={6}
          collisionPadding={16}
          className={clsx('sa-menu z-toast max-w-[calc(100vw-2rem)] overflow-y-auto', className)}
          {...props}
        >
          {children}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}

export type MenuItemProps = ComponentProps<typeof M.Item> & {
  icon?: IconName;
  keys?: string[];
  danger?: boolean;
};

export function MenuItem({ icon, keys, danger, className, children, ...props }: MenuItemProps) {
  return (
    <M.Item className={clsx(ITEM, danger && 'sa-menu__item--danger', className)} {...props}>
      {icon && <Icon name={icon} size={20} />}
      {children}
      {keys && (
        <span className="sa-menu__end">
          {keys.map((k) => (
            <kbd key={k} className="sa-kbd">
              {k}
            </kbd>
          ))}
        </span>
      )}
    </M.Item>
  );
}

const Check = () => (
  <span className="sa-menu__end">
    <M.ItemIndicator>
      <Icon name="check" size={20} />
    </M.ItemIndicator>
  </span>
);

export function MenuCheckItem({ className, children, ...props }: ComponentProps<typeof M.CheckboxItem>) {
  return (
    <M.CheckboxItem className={clsx(ITEM, className)} {...props}>
      {children}
      <Check />
    </M.CheckboxItem>
  );
}

export function MenuRadioItem({ className, children, ...props }: ComponentProps<typeof M.RadioItem>) {
  return (
    <M.RadioItem className={clsx(ITEM, className)} {...props}>
      {children}
      <Check />
    </M.RadioItem>
  );
}

export function MenuLabel({ className, ...props }: ComponentProps<typeof M.Label>) {
  return <M.Label className={clsx('sa-menu__label', className)} {...props} />;
}

export function MenuSeparator({ className, ...props }: ComponentProps<typeof M.Separator>) {
  return <M.Separator className={clsx('sa-menu__sep', className)} {...props} />;
}
