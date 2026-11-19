import type { Metadata } from 'next';
import { RfqForm } from '../../../_components/forms/RfqForm';
import { WorkspacePage } from '../../../_components/WorkspacePage';

export const metadata: Metadata = { title: 'Post an RFQ' };

export default function NewRfqPage() {
  return (
    <WorkspacePage
      breadcrumb={[{ label: 'RFQs', href: '/rfqs' }]}
      currentCrumb="New RFQ"
      title="Post an RFQ"
      description="Post an RFQ in minutes."
    >
      <RfqForm />
    </WorkspacePage>
  );
}
