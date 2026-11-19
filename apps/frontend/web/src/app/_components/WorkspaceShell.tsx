'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/Sheet';
import { Sidebar, type SidebarGroup, type SidebarUser } from '@/components/ui/Sidebar';
import { isCurrentPath, WORKSPACE_GROUPS } from '@/lib/navigation';

type WorkspaceShellProps = {
  user: SidebarUser;
  /** Badge counts keyed by item href; only for things that need action. */
  counts: Record<string, number>;
  children: ReactNode;
};

export function WorkspaceShell({ user, counts, children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const groups: SidebarGroup[] = WORKSPACE_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      ...item,
      count: counts[item.href],
      current: isCurrentPath(pathname, item.href),
    })),
  }));

  return (
    <div className="flex min-h-screen bg-ground">
      <div className="sticky top-0 hidden h-screen shrink-0 p-4 md:block">
        <Sidebar groups={groups} user={user} rail className="h-full lg:hidden" />
        <Sidebar groups={groups} user={user} className="hidden h-full lg:flex" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sa-vt-head sticky top-0 z-sticky flex items-center gap-3 border-b border-card-border bg-chrome px-4 py-3 md:hidden">
          <Sheet key={pathname}>
            <SheetTrigger asChild>
              <IconButton icon="list" aria-label="Open menu" />
            </SheetTrigger>
            <SheetContent title="Menu">
              <Sidebar groups={groups} user={user} className="w-full" />
            </SheetContent>
          </Sheet>
          <img src="/brand/saudaro-lockup-horizontal-navy.svg" alt="SAUDARO" width={110} height={30} />
        </header>
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
