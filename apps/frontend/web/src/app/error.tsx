'use client';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

type ErrorPageProps = { error: Error & { digest?: string }; reset: () => void };

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main id="main" className="mx-auto grid w-full max-w-container px-4 py-16 md:px-6 md:py-20 lg:py-24">
      <EmptyState
        icon="alert"
        title="Something went wrong"
        description="Check your connection and try again."
        action={<Button onClick={reset}>Retry</Button>}
      />
    </main>
  );
}
