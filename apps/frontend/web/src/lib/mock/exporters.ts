export type VerificationEntry = { label: string; detail: string; granted: boolean };

export type Exporter = {
  slug: string;
  name: string;
  initials: string;
  location: string;
  verifiedLevels: number;
  categories: string[];
  documentsReady: number;
  documentsTotal: number;
  replyTime: string;
  completedDeals: number;
  verification: VerificationEntry[];
};

export const EXPORTERS: Exporter[] = [
  {
    slug: 'al-noor-foods',
    name: 'Al Noor Foods',
    initials: 'AN',
    location: 'Lahore, Pakistan',
    verifiedLevels: 4,
    categories: ['Rice', 'Spices', 'Halal', 'ISO 22000'],
    documentsReady: 8,
    documentsTotal: 8,
    replyTime: '1.8 d',
    completedDeals: 42,
    verification: [
      { label: 'Business registration', detail: 'Confirmed 02 Feb 2026', granted: true },
      { label: 'Export licence', detail: 'Confirmed 14 Mar 2026', granted: true },
      { label: 'Food safety certificate', detail: 'Confirmed 21 Apr 2026', granted: true },
      { label: 'Bank account', detail: 'Confirmed 09 May 2026', granted: true },
    ],
  },
  {
    slug: 'karachi-sesame-co',
    name: 'Karachi Sesame Co.',
    initials: 'KS',
    location: 'Karachi, Pakistan',
    verifiedLevels: 3,
    categories: ['Oilseeds', 'Sesame', 'Organic'],
    documentsReady: 6,
    documentsTotal: 8,
    replyTime: '2.4 d',
    completedDeals: 19,
    verification: [
      { label: 'Business registration', detail: 'Confirmed 11 Jan 2026', granted: true },
      { label: 'Export licence', detail: 'Confirmed 03 Mar 2026', granted: true },
      { label: 'Food safety certificate', detail: 'Confirmed 28 Mar 2026', granted: true },
      { label: 'Bank account', detail: 'Pending review', granted: false },
    ],
  },
  {
    slug: 'sindh-spice-traders',
    name: 'Sindh Spice Traders',
    initials: 'SS',
    location: 'Hyderabad, Pakistan',
    verifiedLevels: 2,
    categories: ['Spices', 'Chilli', 'Turmeric'],
    documentsReady: 5,
    documentsTotal: 8,
    replyTime: '3.1 d',
    completedDeals: 11,
    verification: [
      { label: 'Business registration', detail: 'Confirmed 19 Feb 2026', granted: true },
      { label: 'Export licence', detail: 'Confirmed 30 Mar 2026', granted: true },
      { label: 'Food safety certificate', detail: 'Pending review', granted: false },
      { label: 'Bank account', detail: 'Pending review', granted: false },
    ],
  },
  {
    slug: 'khewra-salt-works',
    name: 'Khewra Salt Works',
    initials: 'KW',
    location: 'Jhelum, Pakistan',
    verifiedLevels: 4,
    categories: ['Salt', 'Minerals', 'Food grade'],
    documentsReady: 7,
    documentsTotal: 8,
    replyTime: '1.2 d',
    completedDeals: 57,
    verification: [
      { label: 'Business registration', detail: 'Confirmed 05 Jan 2026', granted: true },
      { label: 'Export licence', detail: 'Confirmed 17 Feb 2026', granted: true },
      { label: 'Food safety certificate', detail: 'Confirmed 12 Mar 2026', granted: true },
      { label: 'Bank account', detail: 'Confirmed 25 Mar 2026', granted: true },
    ],
  },
];

export const findExporter = (slug: string) => EXPORTERS.find((exporter) => exporter.slug === slug);
