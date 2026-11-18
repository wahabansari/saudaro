import * as TabsPrimitive from '@radix-ui/react-tabs';
import clsx from 'clsx';
import type { ComponentProps } from 'react';

export type TabsProps = ComponentProps<typeof TabsPrimitive.Root>;
export type TabsListProps = ComponentProps<typeof TabsPrimitive.List>;
export type TabsTriggerProps = ComponentProps<typeof TabsPrimitive.Trigger>;
export type TabsContentProps = ComponentProps<typeof TabsPrimitive.Content>;

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...props }: TabsListProps) {
  return <TabsPrimitive.List className={clsx('sa-tabs', className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return <TabsPrimitive.Trigger className={clsx('sa-tab', className)} {...props} />;
}
