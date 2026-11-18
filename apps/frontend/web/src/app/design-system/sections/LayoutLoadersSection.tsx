import type { CSSProperties, ReactNode } from 'react';
import { PageLoader } from '@/components/ui/PageLoader';
import { PageTransition } from '@/components/ui/PageTransition';
import { LayoutFrame } from './LayoutFrame';

const CAPTION_STYLE: CSSProperties = {
  font: '500 12px/16px var(--font-sans)',
  color: 'var(--grey-600)',
  marginBottom: 8,
};

const DEMO_CARD_STYLE: CSSProperties = {
  padding: 12,
  border: '1px solid var(--grey-200)',
  borderRadius: 12,
  display: 'grid',
  gap: 8,
};

const THUMB_STYLE: CSSProperties = {
  display: 'block',
  height: 96,
  borderRadius: 8,
  background: 'var(--grey-100)',
};

const determinate = { '--p': 64 } as CSSProperties;

function Stage({ children }: { children: ReactNode }) {
  return <div className="sa-vt__stage">{children}</div>;
}

export function LayoutLoadersSection() {
  return (
    <>
      <LayoutFrame name="PageLoader">
        <PageLoader label="Loading RFQs" inline />
      </LayoutFrame>
      <LayoutFrame name="PageTransition">
        <PageTransition>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 16 }}>
            <div className="sa-vt sa-vt--root">
              <Stage>
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
              </Stage>
              <strong style={{ color: 'var(--ink)' }}>root</strong>Page fades up and out, next page rises in
            </div>
            <div className="sa-vt sa-vt--hero">
              <Stage>
                <div className="sa-vt__page">
                  <i className="h" />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="card" />
              </Stage>
              <strong style={{ color: 'var(--ink)' }}>sa-hero</strong>Card thumbnail grows into the detail
              hero
            </div>
            <div className="sa-vt sa-vt--head">
              <Stage>
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
              </Stage>
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
              background: 'var(--white)',
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
              <img src="/brand/saudaro-lockup-horizontal-navy.svg" height={26} width={95} alt="SAUDARO" />
              <span style={{ flex: 1 }} />
              <button type="button" className="sa-btn sa-btn--text sa-btn--sm">
                Back to list
              </button>
            </header>
            <div data-view="list" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 16, padding: 16 }}>
              <button
                type="button"
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
                <span className="thumb" style={{ ...THUMB_STYLE, background: 'var(--primary-200)' }} />
                <strong>Basmati rice 1121</strong>
                <span style={{ color: 'var(--grey-600)' }}>Click to open</span>
              </button>
              <div style={DEMO_CARD_STYLE}>
                <span style={THUMB_STYLE} />
                <strong>Sesame oil</strong>
              </div>
              <div style={DEMO_CARD_STYLE}>
                <span style={THUMB_STYLE} />
                <strong>Cotton fabric</strong>
              </div>
            </div>
            <div data-view="detail" style={{ gap: 12, padding: 16 }}>
              <span
                className="hero"
                style={{ display: 'block', height: 180, borderRadius: 12, background: 'var(--primary-200)' }}
              />
              <h3 style={{ margin: 0 }}>Basmati rice 1121 Steam</h3>
              <p style={{ margin: 0, color: 'var(--grey-600)' }}>
                The thumbnail morphed into this hero with <code>view-transition-name: sa-hero</code>.
              </p>
            </div>
          </div>
        </PageTransition>
      </LayoutFrame>
      <LayoutFrame name="RouteProgress">
        <div style={{ display: 'grid', gap: 24, padding: 12 }}>
          <div>
            <div className="mono" style={CAPTION_STYLE}>
              Indeterminate
            </div>
            <div className="sa-route" role="progressbar" aria-label="Loading page" />
          </div>
          <div>
            <div style={CAPTION_STYLE}>Determinate · 64%</div>
            <div
              className="sa-route"
              style={determinate}
              role="progressbar"
              aria-valuenow={64}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Uploading"
            />
          </div>
        </div>
      </LayoutFrame>
    </>
  );
}
