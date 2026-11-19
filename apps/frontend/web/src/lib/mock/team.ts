import type { MemberRole, MemberStatus } from './status';

export type TeamMember = {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  joined: string;
  lastActive: string;
};

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'USR-0001',
    name: 'Muhammad Wahab',
    initials: 'MW',
    email: 'm.wahab@alnoorfoods.example',
    role: 'owner',
    status: 'active',
    joined: '2025-11-03',
    lastActive: '2026-11-18',
  },
  {
    id: 'USR-0002',
    name: 'Ayesha Rahman',
    initials: 'AR',
    email: 'ayesha.rahman@alnoorfoods.example',
    role: 'admin',
    status: 'active',
    joined: '2025-11-10',
    lastActive: '2026-11-18',
  },
  {
    id: 'USR-0003',
    name: 'Bilal Chaudhry',
    initials: 'BC',
    email: 'bilal.chaudhry@alnoorfoods.example',
    role: 'member',
    status: 'active',
    joined: '2026-01-12',
    lastActive: '2026-11-17',
  },
  {
    id: 'USR-0004',
    name: 'Sana Iqbal',
    initials: 'SI',
    email: 'sana.iqbal@alnoorfoods.example',
    role: 'member',
    status: 'active',
    joined: '2026-02-24',
    lastActive: '2026-11-15',
  },
  {
    id: 'USR-0005',
    name: 'Omar Farooq',
    initials: 'OF',
    email: 'omar.farooq@alnoorfoods.example',
    role: 'viewer',
    status: 'invited',
    joined: '2026-11-12',
    lastActive: '2026-11-12',
  },
  {
    id: 'USR-0006',
    name: 'Hina Siddiqui',
    initials: 'HS',
    email: 'hina.siddiqui@alnoorfoods.example',
    role: 'member',
    status: 'suspended',
    joined: '2026-03-30',
    lastActive: '2026-09-02',
  },
];
