import type { QuotationStatus } from './status';

export type Quotation = {
  id: string;
  rfqId: string;
  product: string;
  exporter: string;
  exporterInitials: string;
  buyer: string;
  currency: string;
  unitPrice: number;
  unit: string;
  quantity: number;
  incoterm: string;
  payment: string;
  validUntil: string;
  revision: number;
  documents: number;
  status: QuotationStatus;
  updated: string;
};

export const QUOTATIONS: Quotation[] = [
  {
    id: 'QT-2026-0412',
    rfqId: 'RFQ-2026-00418',
    product: 'Basmati rice, 500 MT, bi-monthly',
    exporter: 'Al Noor Foods',
    exporterInitials: 'AN',
    buyer: 'Gulf Foods',
    currency: 'USD',
    unitPrice: 1240,
    unit: 'MT',
    quantity: 250,
    incoterm: 'FOB Karachi',
    payment: '30% advance, 70% on B/L copy',
    validUntil: '2026-11-30',
    revision: 2,
    documents: 6,
    status: 'under_negotiation',
    updated: '2026-11-14',
  },
  {
    id: 'QT-2026-0409',
    rfqId: 'RFQ-2026-00412',
    product: 'Basmati rice 1121 Steam, 25 kg PP bags',
    exporter: 'Al Noor Foods',
    exporterInitials: 'AN',
    buyer: 'Al Noor Trading LLC',
    currency: 'USD',
    unitPrice: 1185,
    unit: 'MT',
    quantity: 1200,
    incoterm: 'CIF Jebel Ali',
    payment: 'Letter of credit at sight',
    validUntil: '2026-12-05',
    revision: 1,
    documents: 5,
    status: 'submitted',
    updated: '2026-11-13',
  },
  {
    id: 'QT-2026-0405',
    rfqId: 'RFQ-2026-00398',
    product: 'Dehydrated red onion flakes, 25 kg',
    exporter: 'Al Noor Foods',
    exporterInitials: 'AN',
    buyer: 'Harvest Lane Ltd',
    currency: 'USD',
    unitPrice: 1450,
    unit: 'MT',
    quantity: 300,
    incoterm: 'FOB Karachi',
    payment: '30% advance, 70% on B/L copy',
    validUntil: '2026-12-01',
    revision: 1,
    documents: 4,
    status: 'submitted',
    updated: '2026-11-12',
  },
  {
    id: 'QT-2026-0398',
    rfqId: 'RFQ-2026-00391',
    product: 'Himalayan pink salt, food grade',
    exporter: 'Khewra Salt Works',
    exporterInitials: 'KW',
    buyer: 'Lion City Foods Pte',
    currency: 'USD',
    unitPrice: 94,
    unit: 'MT',
    quantity: 2500,
    incoterm: 'CIF Singapore',
    payment: 'Letter of credit at sight',
    validUntil: '2026-11-09',
    revision: 1,
    documents: 7,
    status: 'accepted',
    updated: '2026-11-09',
  },
  {
    id: 'QT-2026-0391',
    rfqId: 'RFQ-2026-00387',
    product: 'Turmeric finger, polished, 5% curcumin',
    exporter: 'Sindh Spice Traders',
    exporterInitials: 'SS',
    buyer: 'Brooklyn Spice Co.',
    currency: 'USD',
    unitPrice: 2700,
    unit: 'MT',
    quantity: 80,
    incoterm: 'CIF New York',
    payment: '100% advance',
    validUntil: '2026-11-15',
    revision: 1,
    documents: 4,
    status: 'expired',
    updated: '2026-11-15',
  },
  {
    id: 'QT-2026-0387',
    rfqId: 'RFQ-2026-00380',
    product: 'Red chilli powder, 50,000 SHU',
    exporter: 'Sindh Spice Traders',
    exporterInitials: 'SS',
    buyer: 'Harbourline Imports',
    currency: 'USD',
    unitPrice: 2950,
    unit: 'MT',
    quantity: 12,
    incoterm: 'FOB Karachi',
    payment: '50% advance, 50% on delivery',
    validUntil: '2026-12-10',
    revision: 3,
    documents: 5,
    status: 'rejected',
    updated: '2026-11-11',
  },
  {
    id: 'QT-2026-0380',
    rfqId: 'RFQ-2026-00376',
    product: 'Hulled sesame seeds, 99.95%',
    exporter: 'Karachi Sesame Co.',
    exporterInitials: 'KS',
    buyer: 'Sialkot Safety Gear',
    currency: 'USD',
    unitPrice: 1790,
    unit: 'MT',
    quantity: 40,
    incoterm: 'EXW Karachi',
    payment: '30% advance, 70% on B/L copy',
    validUntil: '2026-11-28',
    revision: 1,
    documents: 6,
    status: 'withdrawn',
    updated: '2026-11-10',
  },
  {
    id: 'QT-2026-0376',
    rfqId: 'RFQ-2026-00405',
    product: 'Cotton knit fabric, 180 GSM, OEKO-TEX',
    exporter: 'Al Noor Foods',
    exporterInitials: 'AN',
    buyer: 'Nordic Textile GmbH',
    currency: 'USD',
    unitPrice: 4020,
    unit: 'MT',
    quantity: 22,
    incoterm: 'CFR Hamburg',
    payment: 'Letter of credit at sight',
    validUntil: '2026-12-02',
    revision: 1,
    documents: 3,
    status: 'draft',
    updated: '2026-11-09',
  },
];

export const findQuotation = (id: string) => QUOTATIONS.find((quotation) => quotation.id === id);
export const quotationsForRfq = (rfqId: string) =>
  QUOTATIONS.filter((quotation) => quotation.rfqId === rfqId);
