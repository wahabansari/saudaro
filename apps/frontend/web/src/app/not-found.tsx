import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotFound() {
  return (
    <main id="main" className="mx-auto grid w-full max-w-container px-4 py-16 md:px-6 md:py-20 lg:py-24">
      <EmptyState
        icon="search"
        title="Page not found"
        description="The link may be wrong or the page may have moved."
        action={
          <Button asChild>
            <Link href="/">Go to home</Link>
          </Button>
        }
      />
    </main>
  );
}
