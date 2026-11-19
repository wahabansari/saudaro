import type { ReactNode } from 'react';
import { Footer } from '@/components/ui/Footer';
import { FOOTER_COLUMNS } from '@/lib/navigation';
import { PublicNavbar } from '../_components/PublicNavbar';
import { SkipLink } from '../_components/SkipLink';

const FOOTER_DESCRIPTION =
  'Find verified exporters, request quotations and negotiate with every document in one place.';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <PublicNavbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer description={FOOTER_DESCRIPTION} columns={FOOTER_COLUMNS} />
    </div>
  );
}
