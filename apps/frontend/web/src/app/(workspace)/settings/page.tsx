import type { Metadata } from 'next';
import { parseGridQuery, type RawSearchParams } from '@/lib/grid-query';
import { AUDIT_EVENTS } from '@/lib/mock/audit';
import { TEAM_MEMBERS } from '@/lib/mock/team';
import { AuditGrid } from '../../_components/grids/AuditGrid';
import { TeamGrid } from '../../_components/grids/TeamGrid';
import { SettingsForm } from '../../_components/forms/SettingsForm';
import { UrlTabs } from '../../_components/UrlTabs';
import { WorkspacePage } from '../../_components/WorkspacePage';

export const metadata: Metadata = { title: 'Settings' };

const TABS = [
  { value: 'preferences', label: 'Preferences' },
  { value: 'team', label: 'Team members' },
  { value: 'audit', label: 'Audit log' },
];

const tabOf = (value: RawSearchParams['tab']) =>
  TABS.find((tab) => tab.value === value)?.value ?? 'preferences';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const query = parseGridQuery(raw);
  const tab = tabOf(raw.tab);

  return (
    <WorkspacePage
      breadcrumb={[]}
      currentCrumb="Settings"
      title="Settings"
      description="Preferences, team and audit log."
    >
      <UrlTabs value={tab} tabs={TABS}>
        {tab === 'team' ? <TeamGrid rows={TEAM_MEMBERS} query={query} /> : null}
        {tab === 'audit' ? <AuditGrid rows={AUDIT_EVENTS} query={query} /> : null}
        {tab === 'preferences' ? <SettingsForm /> : null}
      </UrlTabs>
    </WorkspacePage>
  );
}
