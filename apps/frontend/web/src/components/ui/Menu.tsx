'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import clsx from 'clsx';
import type { ComponentProps } from 'react';
import { Icon, type IconName } from '@/icons';

export type MenuProps = ComponentProps<typeof DropdownMenuPrimitive.Root>;
export type MenuTriggerProps = ComponentProps<typeof DropdownMenuPrimitive.Trigger>;
export type MenuContentProps = ComponentProps<typeof DropdownMenuPrimitive.Content> & {
  container?: HTMLElement;
};
export type MenuSubContentProps = ComponentProps<typeof DropdownMenuPrimitive.SubContent>;
export type MenuLabelProps = ComponentProps<typeof DropdownMenuPrimitive.Label>;
export type MenuSeparatorProps = ComponentProps<typeof DropdownMenuPrimitive.Separator>;
export type MenuItemProps = ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  icon?: IconName;
  shortcut?: string[];
  danger?: boolean;
};
export type MenuCheckboxItemProps = ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>;
export type MenuRadioItemProps = ComponentProps<typeof DropdownMenuPrimitive.RadioItem>;
export type MenuSubTriggerProps = ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  icon?: IconName;
};

const ITEM_IN = '[animation:sa-item-in_340ms_var(--ease-pop)_both]';
const KEEP_VISIBLE = 'data-[state=closed]:![animation:none]';
const PANEL = 'sa-menu z-dropdown [--pop-origin:var(--radix-dropdown-menu-content-transform-origin)]';

export const Menu = DropdownMenuPrimitive.Root;
export const MenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
export const MenuSub = DropdownMenuPrimitive.Sub;

export function MenuTrigger({ className, ...props }: MenuTriggerProps) {
  return <DropdownMenuPrimitive.Trigger className={clsx(KEEP_VISIBLE, className)} {...props} />;
}

export function MenuContent({
  className,
  sideOffset = 6,
  align = 'start',
  container,
  ...props
}: MenuContentProps) {
  return (
    <DropdownMenuPrimitive.Portal container={container}>
      <DropdownMenuPrimitive.Content
        className={clsx(PANEL, className)}
        sideOffset={sideOffset}
        align={align}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function MenuSubContent({ className, ...props }: MenuSubContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent className={clsx(PANEL, className)} {...props} />
    </DropdownMenuPrimitive.Portal>
  );
}

export function MenuLabel({ className, ...props }: MenuLabelProps) {
  return <DropdownMenuPrimitive.Label className={clsx('sa-menu__label', className)} {...props} />;
}

export function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
  return <DropdownMenuPrimitive.Separator className={clsx('sa-menu__sep', className)} {...props} />;
}

export function MenuItem({ icon, shortcut, danger, className, children, ...props }: MenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={clsx('sa-menu__item', ITEM_IN, danger && 'sa-menu__item--danger', className)}
      {...props}
    >
      {icon ? <Icon name={icon} size={20} /> : null}
      {children}
      {shortcut ? (
        <span className="sa-menu__end">
          {shortcut.map((key) => (
            <kbd key={key} className="sa-kbd">
              {key}
            </kbd>
          ))}
        </span>
      ) : null}
    </DropdownMenuPrimitive.Item>
  );
}

export function MenuCheckboxItem({ className, children, ...props }: MenuCheckboxItemProps) {
  return (
    <DropdownMenuPrimitive.CheckboxItem className={clsx('sa-menu__item', ITEM_IN, className)} {...props}>
      {children}
      <DropdownMenuPrimitive.ItemIndicator className="sa-menu__end">
        <Icon name="check" size={20} />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function MenuRadioItem({ className, children, ...props }: MenuRadioItemProps) {
  return (
    <DropdownMenuPrimitive.RadioItem className={clsx('sa-menu__item', ITEM_IN, className)} {...props}>
      {children}
      <DropdownMenuPrimitive.ItemIndicator className="sa-menu__end">
        <Icon name="check" size={20} />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.RadioItem>
  );
}

export function MenuSubTrigger({ icon, className, children, ...props }: MenuSubTriggerProps) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={clsx('sa-menu__item', ITEM_IN, KEEP_VISIBLE, className)}
      {...props}
    >
      {icon ? <Icon name={icon} size={20} /> : null}
      {children}
      <span className="sa-menu__end">
        <Icon name="chevron-right" size={20} />
      </span>
    </DropdownMenuPrimitive.SubTrigger>
  );
}
