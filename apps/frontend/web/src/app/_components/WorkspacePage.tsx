import type { ReactNode } from 'react';
import { PageHeader, type PageHeaderProps } from '@/components/ui/PageHeader';

export const CONTAINER = 'mx-auto w-full max-w-container px-4 md:px-6';

export function WorkspacePage({ children, ...header }: PageHeaderProps & { children?: ReactNode }) {
  return (
    <div className={`${CONTAINER} grid gap-6 py-6 md:py-8`}>
      <PageHeader {...header} />
      {children}
    </div>
  );
}
