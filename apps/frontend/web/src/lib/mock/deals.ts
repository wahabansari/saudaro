import type { DealStatus } from './status';

export type Deal = {
  id: string;
  quotationId: string;
  product: string;
  counterparty: string;
  currency: string;
  value: number;
  quantity: number;
  unit: string;
  incoterm: string;
  status: DealStatus;
  shipmentDate: string;
  updated: string;
};

export const DEALS: Deal[] = [
  {
    id: 'DL-2026-0087',
    quotationId: 'QT-2026-0398',
    product: 'Himalayan pink salt, food grade',
    counterparty: 'Lion City Foods Pte',
    currency: 'USD',
    value: 235000,
    quantity: 2500,
    unit: 'MT',
    incoterm: 'CIF Singapore',
    status: 'in_production',
    shipmentDate: '2026-12-18',
    updated: '2026-11-16',
  },
  {
    id: 'DL-2026-0081',
    quotationId: 'QT-2026-0361',
    product: 'Basmati Rice 1121 Steam',
    counterparty: 'Gulf Foods',
    currency: 'USD',
    value: 295000,
    quantity: 250,
    unit: 'MT',
    incoterm: 'FOB Karachi',
    status: 'shipped',
    shipmentDate: '2026-11-08',
    updated: '2026-11-14',
  },
  {
    id: 'DL-2026-0076',
    quotationId: 'QT-2026-0344',
    product: 'Sella Basmati Rice 1121',
    counterparty: 'Al Noor Trading LLC',
    currency: 'USD',
    value: 131400,
    quantity: 120,
    unit: 'MT',
    incoterm: 'CIF Jebel Ali',
    status: 'delivered',
    shipmentDate: '2026-10-21',
    updated: '2026-11-09',
  },
  {
    id: 'DL-2026-0069',
    quotationId: 'QT-2026-0318',
    product: 'Hulled sesame seeds, 99.95%',
    counterparty: 'Van Dijk Foods BV',
    currency: 'USD',
    value: 70400,
    quantity: 40,
    unit: 'MT',
    incoterm: 'FOB Karachi',
    status: 'completed',
    shipmentDate: '2026-09-30',
    updated: '2026-10-28',
  },
  {
    id: 'DL-2026-0063',
    quotationId: 'QT-2026-0302',
    product: 'Red chilli powder, 50,000 SHU',
    counterparty: 'Harbourline Imports',
    currency: 'USD',
    value: 35400,
    quantity: 12,
    unit: 'MT',
    incoterm: 'FOB Karachi',
    status: 'disputed',
    shipmentDate: '2026-09-12',
    updated: '2026-10-19',
  },
  {
    id: 'DL-2026-0058',
    quotationId: 'QT-2026-0287',
    product: 'Dehydrated red onion flakes, 25 kg',
    counterparty: 'Harvest Lane Ltd',
    currency: 'USD',
    value: 42600,
    quantity: 30,
    unit: 'MT',
    incoterm: 'FOB Karachi',
    status: 'cancelled',
    shipmentDate: '2026-08-25',
    updated: '2026-09-04',
  },
];
