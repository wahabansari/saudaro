/** RBAC catalog: the permissions a company role can hold, and the system roles that hold them. */
export const PERMISSIONS = [
  {
    key: 'company.manage',
    group: 'company',
    description: 'Manage company status and registration identifiers',
  },
  {
    key: 'company.profile.manage',
    group: 'company',
    description: 'Edit public company profile, addresses and contacts',
  },
  {
    key: 'members.manage',
    group: 'team',
    description: 'Add, change and remove team members (below own level)',
  },
  { key: 'roles.manage', group: 'team', description: 'Create and edit custom roles' },
  { key: 'invitations.manage', group: 'team', description: 'Invite people to the company' },
  { key: 'settings.manage', group: 'company', description: 'Edit company settings' },
  { key: 'files.manage', group: 'files', description: 'Upload files and manage file access grants' },
  {
    key: 'verification.submit',
    group: 'verification',
    description: 'Submit documents for business verification',
  },
  { key: 'catalog.manage', group: 'catalog', description: 'Manage products and listings' },
  { key: 'seller_profile.manage', group: 'trade', description: 'Manage the seller trade profile' },
  { key: 'buyer_profile.manage', group: 'trade', description: 'Manage the buyer profile' },
  { key: 'rfq.create', group: 'rfq', description: 'Create and edit RFQs' },
  {
    key: 'rfq.manage',
    group: 'rfq',
    description: 'Delete drafts, invite suppliers, answer clarifications, compare quotations',
  },
  { key: 'quotation.create', group: 'quotation', description: 'Create and edit quotation drafts' },
  { key: 'quotation.submit', group: 'quotation', description: 'Submit, revise and withdraw quotations' },
  {
    key: 'quotation.accept',
    group: 'quotation',
    description: 'Accept or reject quotations and create deals',
  },
  { key: 'messages.send', group: 'messaging', description: 'Send messages in conversations' },
  { key: 'messages.manage', group: 'messaging', description: 'Add colleagues to conversations' },
  {
    key: 'deal.manage',
    group: 'deal',
    description: 'Manage deal documents, milestones, shipments and cancellations',
  },
  { key: 'deal.confirm', group: 'deal', description: 'Confirm deal steps on behalf of the company' },
  { key: 'review.write', group: 'reputation', description: 'Write reviews' },
  { key: 'review.respond', group: 'reputation', description: 'Respond to reviews' },
  { key: 'audit.read', group: 'security', description: 'Read the company audit log' },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]['key'];

const ALL: readonly PermissionKey[] = PERMISSIONS.map((p) => p.key);
const MANAGER = ALL.filter(
  (p) =>
    ![
      'company.manage',
      'members.manage',
      'roles.manage',
      'invitations.manage',
      'settings.manage',
      'audit.read',
    ].includes(p),
);
const MEMBER: readonly PermissionKey[] = [
  'files.manage',
  'catalog.manage',
  'rfq.create',
  'quotation.create',
  'messages.send',
];

/** Higher level outranks lower. */
export const SYSTEM_ROLES: ReadonlyArray<{
  key: string;
  name: string;
  level: number;
  permissions: readonly PermissionKey[];
}> = [
  { key: 'owner', name: 'Owner', level: 100, permissions: ALL },
  { key: 'admin', name: 'Administrator', level: 80, permissions: ALL.filter((p) => p !== 'company.manage') },
  { key: 'manager', name: 'Manager', level: 60, permissions: MANAGER },
  { key: 'member', name: 'Member', level: 40, permissions: MEMBER },
  { key: 'viewer', name: 'Viewer', level: 20, permissions: [] },
];

export const permissionsFor = (roleKey: string): readonly PermissionKey[] =>
  SYSTEM_ROLES.find((r) => r.key === roleKey)?.permissions ?? [];
