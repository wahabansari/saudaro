'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useState, type ReactNode } from 'react';
import { PageTransition } from '@/components/ui/PageTransition';
import { RouteProgress } from '@/components/ui/RouteProgress';
import { ToastProvider, ToastViewport } from '@/components/ui/Toast';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PageTransition>
      <QueryClientProvider client={queryClient}>
        <TooltipPrimitive.Provider>
          <ToastProvider>
            <RouteProgress />
            {children}
            <ToastViewport />
          </ToastProvider>
        </TooltipPrimitive.Provider>
      </QueryClientProvider>
    </PageTransition>
  );
}
