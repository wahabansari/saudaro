import type { ReactNode } from 'react';
import { ViewTransitions } from 'next-view-transitions';

export type PageTransitionProps = { children: ReactNode };

export function PageTransition({ children }: PageTransitionProps) {
  return <ViewTransitions>{children}</ViewTransitions>;
}
