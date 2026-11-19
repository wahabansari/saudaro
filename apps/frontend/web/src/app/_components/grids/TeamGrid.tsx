'use client';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { GridColumnDef } from '@/components/ui/DataGrid.types';
import { Icon, type IconName } from '@/icons';
import type { GridQuery } from '@/lib/grid-query';
import { MEMBER_ROLE_OPTIONS, MEMBER_STATUS_OPTIONS, labelOf, type MemberStatus } from '@/lib/mock/status';
import type { TeamMember } from '@/lib/mock/team';
import { UrlGrid } from '../UrlGrid';
import { statusColumn } from './shared';

const STATUS_BADGE: Record<MemberStatus, { tone: BadgeTone; icon: IconName; label: string }> = {
  active: { tone: 'success', icon: 'ok', label: 'Active' },
  invited: { tone: 'info', icon: 'info', label: 'Invited' },
  suspended: { tone: 'warning', icon: 'warn', label: 'Suspended' },
};

const columns: GridColumnDef<TeamMember>[] = [
  { accessorKey: 'id', header: 'Member ref', size: 150, meta: { filter: 'text', sticky: 'left' } },
  { accessorKey: 'name', header: 'Name', size: 220, meta: { filter: 'text', skeleton: 'avatar' } },
  { accessorKey: 'email', header: 'Email', size: 320, meta: { filter: 'text' } },
  {
    id: 'role',
    header: 'Role',
    size: 140,
    accessorFn: (row) => labelOf(MEMBER_ROLE_OPTIONS, row.role),
    meta: { filter: 'enum' },
  },
  statusColumn<TeamMember>({
    options: MEMBER_STATUS_OPTIONS,
    valueOf: (row) => row.status,
    badge: (row) => {
      const { tone, icon, label } = STATUS_BADGE[row.status];
      return (
        <Badge tone={tone} icon={icon}>
          {label}
        </Badge>
      );
    },
    size: 160,
  }),
  { accessorKey: 'joined', header: 'Joined', size: 140, meta: { filter: 'date' } },
  { accessorKey: 'lastActive', header: 'Last active', size: 150, meta: { filter: 'date' } },
];

type TeamGridProps = { rows: TeamMember[]; query: GridQuery; isLoading?: boolean };

export function TeamGrid({ rows, query, isLoading }: TeamGridProps) {
  return (
    <UrlGrid
      title="Team members"
      columns={columns}
      data={rows}
      query={query}
      isLoading={isLoading}
      getRowId={(row) => row.id}
      searchPlaceholder="Search team members"
      toolbarActions={
        <Button size="sm">
          <Icon name="plus" size={16} />
          Invite member
        </Button>
      }
      noResults={{
        title: 'No team members match your filters',
        description: 'Change or clear a filter to see more team members.',
      }}
      firstUse={{
        icon: 'user',
        title: 'No team members yet',
        description: 'Invite colleagues to work on RFQs and quotations with you.',
      }}
    />
  );
}
