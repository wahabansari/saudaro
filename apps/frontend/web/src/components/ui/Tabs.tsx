'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import clsx from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

export type TabsProps = Omit<ComponentProps<typeof RadixTabs.Root>, 'children'> & {
  items: { value: string; label: ReactNode; panel?: ReactNode }[];
};

export function Tabs({ items, className, ...props }: TabsProps) {
  return (
    <RadixTabs.Root className={clsx('@container', className)} {...props}>
      <RadixTabs.List className="sa-tabs flex-wrap">
        {items.map(({ value, label }) => (
          <RadixTabs.Trigger key={value} value={value} className="sa-tab">
            {label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map(({ value, panel }) => (
        <RadixTabs.Content key={value} value={value} forceMount>
          {panel}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
