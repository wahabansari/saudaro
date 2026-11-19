import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Banner } from '@/components/ui/Banner';
import { VerificationBadge, VerificationList } from '@/components/ui/VerificationBadge';
import { findExporter } from '@/lib/mock/exporters';
import { VerificationForm } from '../../_components/forms/VerificationForm';
import { WorkspacePage } from '../../_components/WorkspacePage';

export const metadata: Metadata = { title: 'Verification' };

export default function VerificationPage() {
  const company = findExporter('al-noor-foods');
  if (!company) notFound();

  return (
    <WorkspacePage
      breadcrumb={[]}
      currentCrumb="Verification"
      title="Verification"
      description="Verified levels show on all your products."
      actions={<VerificationBadge variant="summary" levels={company.verifiedLevels} />}
    >
      <Banner title="Verification in progress.">
        We are checking your bank account details. This usually takes 1 business day.
      </Banner>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="levels-heading" className="grid min-w-0 content-start gap-4">
          <h2 id="levels-heading" className="text-h4">
            Levels
          </h2>
          <VerificationList items={company.verification} />
        </section>
        <section aria-labelledby="submit-heading" className="grid min-w-0 content-start gap-4">
          <h2 id="submit-heading" className="text-h4">
            Submit documents
          </h2>
          <VerificationForm />
        </section>
      </div>
    </WorkspacePage>
  );
}
