'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion';
import { Banner } from '@/components/ui/Banner';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Footer } from '@/components/ui/Footer';
import { Navbar } from '@/components/ui/Navbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Sidebar, type SidebarGroup, type SidebarUser } from '@/components/ui/Sidebar';
import { Stepper } from '@/components/ui/Stepper';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Icon } from '@/icons';
import { LayoutFrame } from './LayoutFrame';
import { LayoutLoadersSection } from './LayoutLoadersSection';

const noop = () => undefined;

// The previews show tab lists without panels, so the triggers must not reference one.
const NO_PANEL = { 'aria-controls': undefined };

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Trade',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'home' },
      { label: 'RFQs', href: '/rfqs', icon: 'clipboard', count: 12, current: true },
      { label: 'Quotations', href: '/quotations', icon: 'receipt', count: 4 },
      { label: 'Negotiations', href: '/negotiations', icon: 'handshake' },
      { label: 'Products', href: '/products', icon: 'package' },
      { label: 'Documents', href: '/documents', icon: 'folder' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings', href: '/settings', icon: 'gear' },
      { label: 'Help centre', title: 'Help', href: '/help', icon: 'question' },
    ],
  },
];

const SIDEBAR_USER: SidebarUser = { initials: 'MW', name: 'Muhammad Wahab', role: 'Exporter · Verified' };

const FOOTER_COLUMNS = [
  [
    { label: 'Products', href: '#products' },
    { label: 'RFQs', href: '#rfqs' },
    { label: 'Exporters', href: '#exporters' },
  ],
  [
    { label: 'Privacy', href: '#privacy' },
    { label: 'Terms', href: '#terms' },
    { label: 'Contact', href: '#contact' },
  ],
];

export function LayoutSection() {
  return (
    <>
      <LayoutFrame name="Banner">
        <div style={{ display: 'grid', gap: 12 }}>
          <Banner
            title="Verification in progress."
            action={
              <button type="button" className="sa-btn sa-btn--text sa-btn--sm">
                View status
              </button>
            }
            onDismiss={noop}
          >
            We are checking your IEC certificate. This usually takes 1 business day.
          </Banner>
          <Banner
            variant="warning"
            title="3 documents expire in 14 days."
            action={
              <button type="button" className="sa-btn sa-btn--secondary sa-btn--sm">
                Review documents
              </button>
            }
          >
            Buyers cannot download expired certificates.
          </Banner>
          <Banner variant="success" title="Your company is verified." onDismiss={noop}>
            The verified badge now shows on all your products.
          </Banner>
        </div>
      </LayoutFrame>
      <LayoutFrame name="PageHeader">
        <PageHeader
          style={{ padding: 8 }}
          breadcrumb={[{ label: 'RFQs', href: '/rfqs' }]}
          currentCrumb="RFQ-2026-0412"
          title="Basmati rice 1121 Steam"
          description="1,200 MT, CIF Jebel Ali. Closes 12 Dec 2026. 6 documents attached."
          actions={
            <>
              <button type="button" className="sa-btn sa-btn--secondary">
                <Icon name="export" size={20} />
                Export
              </button>
              <button type="button" className="sa-btn">
                <Icon name="send" size={20} />
                Send quotation
              </button>
            </>
          }
        >
          <Tabs defaultValue="overview">
            <TabsList style={{ marginTop: 4 }}>
              <TabsTrigger {...NO_PANEL} value="overview">
                Overview
              </TabsTrigger>
              <TabsTrigger {...NO_PANEL} value="documents">
                Documents <span className="sa-badge sa-badge--info">6</span>
              </TabsTrigger>
              <TabsTrigger {...NO_PANEL} value="quotations">
                Quotations
              </TabsTrigger>
              <TabsTrigger {...NO_PANEL} value="activity">
                Activity
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </PageHeader>
      </LayoutFrame>
      <LayoutFrame name="Sidebar">
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <Sidebar style={{ height: 620 }} groups={SIDEBAR_GROUPS} user={SIDEBAR_USER} onCollapse={noop} />
          <Sidebar
            style={{ height: 620 }}
            rail
            groups={SIDEBAR_GROUPS}
            user={SIDEBAR_USER}
            onCollapse={noop}
          />
          <div
            style={{
              flex: 1,
              height: 620,
              border: '2px solid var(--grey-200)',
              borderRadius: 14,
              background: 'var(--white)',
              padding: 24,
              display: 'grid',
              gap: 14,
              alignContent: 'start',
            }}
          >
            <span className="sa-skel sa-skel--title" style={{ width: '36%' }} />
            <span className="sa-skel sa-skel--line" style={{ width: '52%' }} />
            <span className="sa-skel sa-skel--block" style={{ height: 140 }} />
            <span className="sa-skel sa-skel--block" style={{ height: 140 }} />
          </div>
        </div>
      </LayoutFrame>
      <LayoutFrame name="Accordion">
        <Accordion type="single" collapsible defaultValue="payment" style={{ maxWidth: 520 }}>
          <AccordionItem value="payment">
            <AccordionTrigger>Payment terms</AccordionTrigger>
            <AccordionContent>30% advance, 70% against copy of bill of lading.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="packing">
            <AccordionTrigger>Packing</AccordionTrigger>
          </AccordionItem>
        </Accordion>
      </LayoutFrame>
      <LayoutFrame name="Breadcrumb">
        <div>
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Rice', href: '/rice' },
              { label: 'Basmati', href: '/basmati' },
            ]}
            current="Basmati 1121 Steam"
          />
        </div>
      </LayoutFrame>
      <LayoutFrame name="Footer">
        <div>
          <Footer
            description="Find verified exporters, request quotations and negotiate with every document in one place."
            columns={FOOTER_COLUMNS}
          />
        </div>
      </LayoutFrame>
      <LayoutFrame name="Navbar">
        <div>
          <Navbar
            links={[
              { label: 'Products', href: '#products', current: true },
              { label: 'RFQs', href: '#rfqs' },
              { label: 'Exporters', href: '#exporters' },
            ]}
          >
            <button type="button" className="sa-btn sa-btn--text sa-btn--sm">
              Sign in
            </button>
            <button type="button" className="sa-btn sa-btn--sm">
              Post an RFQ
            </button>
          </Navbar>
        </div>
      </LayoutFrame>
      <LayoutFrame name="Pagination">
        <div>
          <Pagination page={2} pageCount={16} hrefFor={() => '#'} />
        </div>
      </LayoutFrame>
      <LayoutFrame name="Stepper">
        <div>
          <Stepper steps={['Product', 'Quantity', 'Delivery', 'Review']} current={1} />
        </div>
      </LayoutFrame>
      <LayoutFrame name="Tabs">
        <div>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger {...NO_PANEL} value="overview">
                Overview
              </TabsTrigger>
              <TabsTrigger {...NO_PANEL} value="documents">
                Documents <span className="sa-badge sa-badge--pill">8</span>
              </TabsTrigger>
              <TabsTrigger {...NO_PANEL} value="reviews">
                Reviews
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </LayoutFrame>
      <LayoutLoadersSection />
    </>
  );
}
