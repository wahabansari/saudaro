import type { Metadata } from 'next';
import { AccountForm } from '../../_components/forms/AccountForm';
import { WorkspacePage } from '../../_components/WorkspacePage';

export const metadata: Metadata = { title: 'Account' };

export default function AccountPage() {
  return (
    <WorkspacePage
      breadcrumb={[]}
      currentCrumb="Account"
      title="Account"
      description="Your details and company profile."
    >
      <AccountForm />
    </WorkspacePage>
  );
}
