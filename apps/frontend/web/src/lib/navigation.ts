import type { IconName } from '@/icons';

export type NavEntry = { label: string; href: string; icon: IconName };
export type NavGroupEntry = { label: string; items: NavEntry[] };

export const PUBLIC_LINKS = [
  { label: 'Products', href: '/catalog' },
  { label: 'RFQs', href: '/rfqs' },
  { label: 'Exporters', href: '/catalog#exporters' },
];

export const FOOTER_COLUMNS = [
  [
    { label: 'Products', href: '/catalog' },
    { label: 'RFQs', href: '/rfqs' },
    { label: 'Exporters', href: '/catalog#exporters' },
  ],
  [
    { label: 'Privacy', href: '#' },
    { label: 'Terms', href: '#' },
    { label: 'Contact', href: '#' },
  ],
];

export const WORKSPACE_GROUPS: NavGroupEntry[] = [
  {
    label: 'Trade',
    items: [
      { label: 'RFQs', href: '/rfqs', icon: 'clipboard' },
      { label: 'Quotations', href: '/quotations', icon: 'receipt' },
      { label: 'Products', href: '/products', icon: 'package' },
      { label: 'Documents', href: '/documents', icon: 'folder' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Account', href: '/account', icon: 'user' },
      { label: 'Verification', href: '/verification', icon: 'shield' },
      { label: 'Settings', href: '/settings', icon: 'gear' },
    ],
  },
];

export const isCurrentPath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
