import type { IconName } from '@/icons';
import type { DocumentState } from './status';

export type TradeDocument = {
  id: string;
  name: string;
  type: string;
  format: string;
  sizeKb: number;
  state: DocumentState;
  owner: string;
  exporterSlug: string;
  uploaded: string;
  expires: string | null;
  note: string;
};

export const DOCUMENTS: TradeDocument[] = [
  {
    id: 'DOC-0231',
    name: 'ISO-22000-certificate-2026.pdf',
    type: 'Certificate',
    format: 'PDF',
    sizeKb: 1229,
    state: 'valid',
    owner: 'Basmati Rice 1121 Steam',
    exporterSlug: 'al-noor-foods',
    uploaded: '2026-03-14',
    expires: '2027-03-13',
    note: '14 Mar 2026',
  },
  {
    id: 'DOC-0230',
    name: 'Commercial-invoice-sample.pdf',
    type: 'Commercial invoice',
    format: 'PDF',
    sizeKb: 240,
    state: 'sample',
    owner: 'Basmati Rice 1121 Steam',
    exporterSlug: 'al-noor-foods',
    uploaded: '2026-03-14',
    expires: null,
    note: 'Sample',
  },
  {
    id: 'DOC-0229',
    name: 'Bill-of-lading-template.pdf',
    type: 'Bill of lading',
    format: 'PDF',
    sizeKb: 310,
    state: 'restricted',
    owner: 'Basmati Rice 1121 Steam',
    exporterSlug: 'al-noor-foods',
    uploaded: '2026-03-14',
    expires: null,
    note: 'Visible to verified importers',
  },
  {
    id: 'DOC-0228',
    name: 'Phytosanitary-2025.pdf',
    type: 'Certificate',
    format: 'PDF',
    sizeKb: 880,
    state: 'expired',
    owner: 'Sella Basmati Rice 1121',
    exporterSlug: 'al-noor-foods',
    uploaded: '2025-01-02',
    expires: '2026-01-01',
    note: 'Expired 01 Jan 2026',
  },
  {
    id: 'DOC-0225',
    name: 'Halal-certificate-2026.pdf',
    type: 'Certificate',
    format: 'PDF',
    sizeKb: 640,
    state: 'valid',
    owner: 'Sella Basmati Rice 1121',
    exporterSlug: 'al-noor-foods',
    uploaded: '2026-04-02',
    expires: '2027-04-01',
    note: '02 Apr 2026',
  },
  {
    id: 'DOC-0221',
    name: 'Certificate-of-origin-sample.pdf',
    type: 'Certificate of origin',
    format: 'PDF',
    sizeKb: 420,
    state: 'sample',
    owner: 'Dehydrated red onion flakes',
    exporterSlug: 'al-noor-foods',
    uploaded: '2026-05-11',
    expires: null,
    note: 'Sample',
  },
  {
    id: 'DOC-0217',
    name: 'Lab-report-coa-batch-77.pdf',
    type: 'Lab report',
    format: 'PDF',
    sizeKb: 2150,
    state: 'valid',
    owner: 'Basmati Rice 1121 Steam',
    exporterSlug: 'al-noor-foods',
    uploaded: '2026-10-30',
    expires: '2027-04-29',
    note: '30 Oct 2026',
  },
  {
    id: 'DOC-0212',
    name: 'Packing-list-sample.pdf',
    type: 'Packing list',
    format: 'PDF',
    sizeKb: 190,
    state: 'sample',
    owner: 'Sella Basmati Rice 1121',
    exporterSlug: 'al-noor-foods',
    uploaded: '2026-06-18',
    expires: null,
    note: 'Sample',
  },
  {
    id: 'DOC-0208',
    name: 'Export-licence-2026.pdf',
    type: 'Licence',
    format: 'PDF',
    sizeKb: 760,
    state: 'restricted',
    owner: 'Company',
    exporterSlug: 'al-noor-foods',
    uploaded: '2026-02-20',
    expires: '2027-02-19',
    note: 'Visible to verified importers',
  },
  {
    id: 'DOC-0204',
    name: 'Fumigation-certificate-2025.pdf',
    type: 'Certificate',
    format: 'PDF',
    sizeKb: 515,
    state: 'expired',
    owner: 'Dehydrated red onion flakes',
    exporterSlug: 'al-noor-foods',
    uploaded: '2025-09-12',
    expires: '2026-09-11',
    note: 'Expired 11 Sep 2026',
  },
];

export const DOCUMENT_ICONS: Record<string, IconName> = {
  Certificate: 'certificate',
  'Certificate of origin': 'certificate',
  'Commercial invoice': 'receipt',
  'Bill of lading': 'ship',
  'Lab report': 'clipboard',
  'Packing list': 'package',
  Licence: 'file',
};

export const documentsOf = (exporterSlug: string) =>
  DOCUMENTS.filter((document) => document.exporterSlug === exporterSlug);
