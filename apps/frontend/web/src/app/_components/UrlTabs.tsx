'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

type UrlTabsProps = {
  /** Active tab, read from the `tab` search param by the page. */
  value: string;
  tabs: { value: string; label: string }[];
  /** Content of the active tab. */
  children: ReactNode;
};

/** Tabs whose active value lives in the `tab` search param; switching tabs drops the other params. */
export function UrlTabs({ value, tabs, children }: UrlTabsProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Tabs
      value={value}
      onValueChange={(next) => router.replace(`${pathname}?tab=${next}`, { scroll: false })}
    >
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={value} className="pt-6">
        {children}
      </TabsContent>
    </Tabs>
  );
}
