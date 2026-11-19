import type { ProductStatus } from './status';

export type Product = {
  id: string;
  name: string;
  exporterSlug: string;
  hsCode: string;
  category: string;
  moq: number;
  moqUnit: string;
  priceFrom: number;
  currency: string;
  incoterm: string;
  port: string;
  documents: number;
  status: ProductStatus;
  updated: string;
};

export const PRODUCTS: Product[] = [
  {
    id: 'PRD-0118',
    name: 'Basmati Rice 1121 Steam',
    exporterSlug: 'al-noor-foods',
    hsCode: '1006.30',
    category: 'Rice',
    moq: 25,
    moqUnit: 'MT',
    priceFrom: 1180,
    currency: 'USD',
    incoterm: 'FOB',
    port: 'Karachi',
    documents: 8,
    status: 'published',
    updated: '2026-11-14',
  },
  {
    id: 'PRD-0117',
    name: 'Sella Basmati Rice 1121',
    exporterSlug: 'al-noor-foods',
    hsCode: '1006.30',
    category: 'Rice',
    moq: 25,
    moqUnit: 'MT',
    priceFrom: 1095,
    currency: 'USD',
    incoterm: 'FOB',
    port: 'Karachi',
    documents: 7,
    status: 'published',
    updated: '2026-11-10',
  },
  {
    id: 'PRD-0114',
    name: 'Red chilli powder, 50,000 SHU',
    exporterSlug: 'sindh-spice-traders',
    hsCode: '0904.22',
    category: 'Spices',
    moq: 5,
    moqUnit: 'MT',
    priceFrom: 2890,
    currency: 'USD',
    incoterm: 'CIF',
    port: 'Jebel Ali',
    documents: 5,
    status: 'published',
    updated: '2026-11-08',
  },
  {
    id: 'PRD-0112',
    name: 'Turmeric finger, polished',
    exporterSlug: 'sindh-spice-traders',
    hsCode: '0910.30',
    category: 'Spices',
    moq: 10,
    moqUnit: 'MT',
    priceFrom: 2640,
    currency: 'USD',
    incoterm: 'CIF',
    port: 'New York',
    documents: 4,
    status: 'paused',
    updated: '2026-10-29',
  },
  {
    id: 'PRD-0109',
    name: 'Hulled sesame seeds, 99.95%',
    exporterSlug: 'karachi-sesame-co',
    hsCode: '1207.40',
    category: 'Oilseeds',
    moq: 20,
    moqUnit: 'MT',
    priceFrom: 1760,
    currency: 'USD',
    incoterm: 'FOB',
    port: 'Karachi',
    documents: 6,
    status: 'published',
    updated: '2026-10-27',
  },
  {
    id: 'PRD-0105',
    name: 'Cold pressed sesame oil, 5 L tins',
    exporterSlug: 'karachi-sesame-co',
    hsCode: '1515.50',
    category: 'Oilseeds',
    moq: 2,
    moqUnit: 'MT',
    priceFrom: 2310,
    currency: 'USD',
    incoterm: 'FOB',
    port: 'Karachi',
    documents: 6,
    status: 'draft',
    updated: '2026-10-20',
  },
  {
    id: 'PRD-0102',
    name: 'Himalayan pink salt, food grade',
    exporterSlug: 'khewra-salt-works',
    hsCode: '2501.00',
    category: 'Salt',
    moq: 50,
    moqUnit: 'MT',
    priceFrom: 96.5,
    currency: 'USD',
    incoterm: 'CIF',
    port: 'Singapore',
    documents: 7,
    status: 'published',
    updated: '2026-10-12',
  },
  {
    id: 'PRD-0098',
    name: 'Dehydrated red onion flakes, 25 kg',
    exporterSlug: 'al-noor-foods',
    hsCode: '0712.20',
    category: 'Vegetables',
    moq: 10,
    moqUnit: 'MT',
    priceFrom: 1420,
    currency: 'USD',
    incoterm: 'FOB',
    port: 'Karachi',
    documents: 3,
    status: 'draft',
    updated: '2026-10-02',
  },
];

export const publishedProductsOf = (exporterSlug: string) =>
  PRODUCTS.filter((product) => product.exporterSlug === exporterSlug && product.status === 'published');
