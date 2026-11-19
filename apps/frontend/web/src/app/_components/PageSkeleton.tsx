import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { CONTAINER } from './WorkspacePage';

/** Loading shape of a workspace page: breadcrumb, title, one line of text, then the content. */
export function PageSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className={`${CONTAINER} grid gap-6 py-6 md:py-8`} aria-busy="true">
      <div className="grid gap-3">
        <Skeleton className="w-1/4" />
        <Skeleton variant="title" className="w-1/3" />
        <Skeleton className="w-1/2" />
      </div>
      {children ?? <Skeleton variant="block" />}
    </div>
  );
}
