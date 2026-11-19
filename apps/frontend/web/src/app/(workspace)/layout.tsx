import type { ReactNode } from 'react';
import { CURRENT_USER } from '@/lib/mock/session';
import { QUOTATIONS } from '@/lib/mock/quotations';
import { RFQS } from '@/lib/mock/rfqs';
import { SkipLink } from '../_components/SkipLink';
import { WorkspaceShell } from '../_components/WorkspaceShell';

const counts = {
  '/rfqs': RFQS.filter((rfq) => rfq.status === 'published').length,
  '/quotations': QUOTATIONS.filter((quotation) => quotation.status === 'under_negotiation').length,
};

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = { initials: CURRENT_USER.initials, name: CURRENT_USER.name, role: CURRENT_USER.role };

  return (
    <>
      <SkipLink />
      <WorkspaceShell user={user} counts={counts}>
        {children}
      </WorkspaceShell>
    </>
  );
}
