'use client';

import type { ReactNode } from 'react';
import { Accordion } from '@/components/ui/Accordion';
import { Banner } from '@/components/ui/Banner';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Footer } from '@/components/ui/Footer';
import { Navbar } from '@/components/ui/Navbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { PageTransition } from '@/components/ui/PageTransition';
import { Pagination } from '@/components/ui/Pagination';
import { RouteProgress } from '@/components/ui/RouteProgress';
import { Sidebar } from '@/components/ui/Sidebar';
import { Stepper } from '@/components/ui/Stepper';
import { Tabs } from '@/components/ui/Tabs';
import { Icon } from '@/icons';

const SIDEBAR = {
  sections: [
    {
      label: 'Trade',
      items: [
        { href: '#', label: 'Dashboard', icon: 'home' },
        { href: '#', label: 'RFQs', icon: 'clipboard', badge: 12, current: true },
        { href: '#', label: 'Quotations', icon: 'receipt', badge: 4 },
        { href: '#', label: 'Negotiations', icon: 'handshake' },
        { href: '#', label: 'Products', icon: 'package' },
        { href: '#', label: 'Documents', icon: 'folder' },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '#', label: 'Settings', icon: 'gear' },
        { href: '#', label: 'Help centre', icon: 'question' },
      ],
    },
  ],
  user: { initials: 'MW', name: 'Muhammad Wahab', role: 'Exporter · Verified' },
} as const;

const SIDEBAR_ITEMS = SIDEBAR.sections.map((s) => ({ ...s, items: [...s.items] }));
const label = { font: '500 12px/16px var(--font-sans)', color: 'var(--grey-600)', marginBottom: 8 } as const;

function Section({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section id={name} aria-labelledby={`${name}-h`}>
      <h3 id={`${name}-h`} className="text-h4">
        {name}
      </h3>
      <div data-ds-component={name}>{children}</div>
    </section>
  );
}

export function LayoutView() {
  return (
    <>
      <Section name="Banner">
        <div style={{ display: 'grid', gap: 12 }}>
          <Banner
            heading="Verification in progress."
            action={<button className="sa-btn sa-btn--text sa-btn--sm">View status</button>}
            onDismiss={() => undefined}
          >
            We are checking your IEC certificate. This usually takes 1 business day.
          </Banner>
          <Banner
            variant="warning"
            heading="3 documents expire in 14 days."
            action={<button className="sa-btn sa-btn--secondary sa-btn--sm">Review documents</button>}
          >
            Buyers cannot download expired certificates.
          </Banner>
          <Banner variant="success" heading="Your company is verified." onDismiss={() => undefined}>
            The verified badge now shows on all your products.
          </Banner>
        </div>
      </Section>

      <Section name="PageHeader">
        <PageHeader
          style={{ padding: 8 }}
          breadcrumb={<Breadcrumb items={[{ label: 'RFQs', href: '#' }, { label: 'RFQ-2026-0412' }]} />}
          title="Basmati rice 1121 Steam"
          description="1,200 MT, CIF Jebel Ali. Closes 12 Dec 2026. 6 documents attached."
          actions={
            <>
              <button className="sa-btn sa-btn--secondary">
                <Icon name="export" />
                Export
              </button>
              <button className="sa-btn">
                <Icon name="send" />
                Send quotation
              </button>
            </>
          }
        >
          <Tabs
            className="mt-1"
            defaultValue="overview"
            items={[
              { value: 'overview', label: 'Overview' },
              {
                value: 'documents',
                label: (
                  <>
                    Documents <span className="sa-badge sa-badge--info">6</span>
                  </>
                ),
              },
              { value: 'quotations', label: 'Quotations' },
              { value: 'activity', label: 'Activity' },
            ]}
          />
        </PageHeader>
      </Section>

      <Section name="Sidebar">
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <Sidebar style={{ height: 620 }} sections={SIDEBAR_ITEMS} user={SIDEBAR.user} />
          <Sidebar rail style={{ height: 620 }} sections={SIDEBAR_ITEMS} user={SIDEBAR.user} />
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
      </Section>

      <Section name="Accordion">
        <Accordion
          style={{ maxWidth: 520 }}
          defaultValue="payment"
          items={[
            {
              value: 'payment',
              title: 'Payment terms',
              content: '30% advance, 70% against copy of bill of lading.',
            },
            { value: 'packing', title: 'Packing' },
          ]}
        />
      </Section>

      <Section name="Breadcrumb">
        <Breadcrumb
          items={[
            { label: 'Home', href: '#' },
            { label: 'Rice', href: '#' },
            { label: 'Basmati', href: '#' },
            { label: 'Basmati 1121 Steam' },
          ]}
        />
      </Section>

      <Section name="Footer">
        <Footer
          description="Find verified exporters, request quotations and negotiate with every document in one place."
          columns={[
            [
              { href: '#', label: 'Products' },
              { href: '#', label: 'RFQs' },
              { href: '#', label: 'Exporters' },
            ],
            [
              { href: '#', label: 'Privacy' },
              { href: '#', label: 'Terms' },
              { href: '#', label: 'Contact' },
            ],
          ]}
        />
      </Section>

      <Section name="Navbar">
        <Navbar
          links={[
            { href: '#products', label: 'Products', current: true },
            { href: '#rfqs', label: 'RFQs' },
            { href: '#exporters', label: 'Exporters' },
          ]}
        >
          <button className="sa-btn sa-btn--text sa-btn--sm">Sign in</button>
          <button className="sa-btn sa-btn--sm">Post an RFQ</button>
        </Navbar>
      </Section>

      <Section name="Pagination">
        <Pagination page={2} total={16} href={(n) => `#page-${n}`} />
      </Section>

      <Section name="Stepper">
        <Stepper steps={['Product', 'Quantity', 'Delivery', 'Review']} current={1} />
      </Section>

      <Section name="Tabs">
        <Tabs
          defaultValue="overview"
          items={[
            { value: 'overview', label: 'Overview' },
            {
              value: 'documents',
              label: (
                <>
                  Documents <span className="sa-badge sa-badge--pill">8</span>
                </>
              ),
            },
            { value: 'reviews', label: 'Reviews' },
          ]}
        />
      </Section>

      <Section name="PageLoader">
        <PageLoader inline label="Loading RFQs" />
      </Section>

      <Section name="PageTransition">
        <PageTransition>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 16 }}>
            <div className="sa-vt sa-vt--root">
              <div className="sa-vt__stage">
                <div className="sa-vt__page p1">
                  <i className="h" />
                  <i />
                  <i />
                  <i className="b" style={{ width: '40%' }} />
                </div>
                <div className="sa-vt__page p2">
                  <i className="h" style={{ width: '70%' }} />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <strong style={{ color: 'var(--ink)' }}>root</strong>Page fades up and out, next page rises in
            </div>
            <div className="sa-vt sa-vt--hero">
              <div className="sa-vt__stage">
                <div className="sa-vt__page">
                  <i className="h" />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="card" />
              </div>
              <strong style={{ color: 'var(--ink)' }}>sa-hero</strong>Card thumbnail grows into the detail
              hero
            </div>
            <div className="sa-vt sa-vt--head">
              <div className="sa-vt__stage">
                <div className="hd" />
                <div className="sa-vt__page p1">
                  <i className="h" />
                  <i />
                  <i className="b" style={{ width: '50%' }} />
                </div>
                <div className="sa-vt__page p2">
                  <i className="h" style={{ width: '65%' }} />
                  <i />
                  <i />
                </div>
              </div>
              <strong style={{ color: 'var(--ink)' }}>sa-head</strong>Header stays, only the content changes
            </div>
          </div>
          <div
            className="sa-vtdemo"
            data-view="list"
            style={{
              marginTop: 20,
              border: '1px solid var(--grey-200)',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <header
              className="sa-vt-head"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                height: 56,
                padding: '0 16px',
                borderBottom: '1px solid var(--grey-200)',
                background: 'var(--grey-100)',
              }}
            >
              <img
                src="/brand/saudaro-lockup-horizontal-navy.svg"
                height={26}
                width={95}
                alt="SAUDARO"
                className="w-auto"
              />
              <span style={{ flex: 1 }} />
              <button className="sa-btn sa-btn--text sa-btn--sm">Back to list</button>
            </header>
            <div data-view="list" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 16, padding: 16 }}>
              <button
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'grid',
                  gap: 8,
                  padding: 12,
                  border: '1px solid var(--grey-200)',
                  borderRadius: 12,
                }}
              >
                <span
                  style={{ display: 'block', height: 96, borderRadius: 8, background: 'var(--primary-200)' }}
                />
                <strong>Basmati rice 1121</strong>
                <span style={{ color: 'var(--grey-600)' }}>Click to open</span>
              </button>
              {['Sesame oil', 'Cotton fabric'].map((name) => (
                <div
                  key={name}
                  style={{
                    padding: 12,
                    border: '1px solid var(--grey-200)',
                    borderRadius: 12,
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <span
                    style={{ display: 'block', height: 96, borderRadius: 8, background: 'var(--grey-100)' }}
                  />
                  <strong>{name}</strong>
                </div>
              ))}
            </div>
          </div>
        </PageTransition>
      </Section>

      <Section name="RouteProgress">
        <div style={{ display: 'grid', gap: 24, padding: 12 }}>
          <div>
            <div style={label}>Indeterminate</div>
            <RouteProgress />
          </div>
          <div>
            <div style={label}>Determinate · 64%</div>
            <RouteProgress value={64} label="Uploading" />
          </div>
        </div>
      </Section>
    </>
  );
}
