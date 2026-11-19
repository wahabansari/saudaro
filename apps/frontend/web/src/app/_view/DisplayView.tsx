'use client';

import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Card, CardBody, CardLink } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Divider } from '@/components/ui/Divider';
import { Progress } from '@/components/ui/Progress';
import { Rating } from '@/components/ui/Rating';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { Statistic } from '@/components/ui/Statistic';
import { Tag } from '@/components/ui/Tag';
import { Timeline, TimelineItem } from '@/components/ui/Timeline';
import { Toast, ToastProvider, ToastViewport } from '@/components/ui/Toast';
import type { IconName } from '@/icons';

const TONE_ICON: Record<NonNullable<BadgeProps['tone']>, IconName> = {
  neutral: 'circle',
  info: 'info',
  success: 'ok',
  warning: 'warn',
  danger: 'alert',
  outline: 'clock',
  solid: 'ok',
};

type Status = [NonNullable<BadgeProps['tone']>, string];
const BADGE_GROUPS: [string, Status[]][] = [
  [
    'RFQ STATUS',
    [
      ['neutral', 'Draft'],
      ['info', 'Published'],
      ['warning', 'Paused'],
      ['neutral', 'Closed'],
      ['outline', 'Expired'],
      ['danger', 'Cancelled'],
      ['success', 'Awarded'],
    ],
  ],
  [
    'QUOTATION STATUS',
    [
      ['neutral', 'Draft'],
      ['info', 'Submitted'],
      ['warning', 'Under negotiation'],
      ['success', 'Accepted'],
      ['danger', 'Rejected'],
      ['outline', 'Withdrawn'],
      ['outline', 'Expired'],
      ['outline', 'Superseded'],
    ],
  ],
  [
    'DEAL STATUS',
    [
      ['info', 'Active'],
      ['info', 'In production'],
      ['info', 'Shipped'],
      ['success', 'Delivered'],
      ['success', 'Completed'],
      ['danger', 'Cancelled'],
      ['danger', 'Disputed'],
    ],
  ],
  [
    'VERIFICATION CASE STATUS',
    [
      ['neutral', 'Draft'],
      ['info', 'Submitted'],
      ['info', 'In review'],
      ['warning', 'Needs info'],
      ['success', 'Approved'],
      ['danger', 'Rejected'],
      ['outline', 'Expired'],
      ['danger', 'Revoked'],
    ],
  ],
];
const TONES = ['neutral', 'info', 'success', 'warning', 'danger', 'outline', 'solid'] as const;
const BADGE_LABEL = {
  display: 'block',
  margin: 0,
  font: '600 12px/16px var(--font-mono)',
  color: 'var(--card-muted)',
};
const BADGE_ROW = { display: 'flex', flexWrap: 'wrap', gap: 8, margin: '6px 0 16px' } as const;
const cardTitle = { font: '600 18px/26px var(--font-sans)' };
const progressLabel = { font: '500 14px/20px var(--font-sans)', marginBottom: 6 };

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

export function DisplayView() {
  return (
    <>
      <Section name="Avatar">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Avatar size="sm">KR</Avatar>
          <Avatar>MW</Avatar>
          <Avatar size="lg">AN</Avatar>
          <Avatar solid>GF</Avatar>
          <Avatar square size="lg">
            AN
          </Avatar>
        </div>
      </Section>

      <Section name="Card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          <Card>
            <h3 style={cardTitle}>Static card</h3>
            <p className="sa-muted" style={{ margin: '8px 0 0' }}>
              Groups related content with a a 2px border and 12px radius.
            </p>
          </Card>
          <CardLink href="#">
            <h3 style={cardTitle}>Interactive card</h3>
            <p className="sa-muted" style={{ margin: '8px 0 0' }}>
              Lifts on hover. The whole card is one link.
            </p>
          </CardLink>
        </div>
      </Section>

      <Section name="Chip">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip pressed>Rice</Chip>
          <Chip>Spices</Chip>
          <Chip>Textiles</Chip>
          <Chip icon="filter">More filters</Chip>
        </div>
      </Section>

      <Section name="Divider">
        <div style={{ maxWidth: 420 }}>
          <div>Payment terms</div>
          <Divider />
          <Divider label="or continue with" />
        </div>
      </Section>

      <Section name="Rating">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Rating value={4.6} />
          <span className="sa-mono">4.6</span>
          <span className="sa-muted">(128 reviews)</span>
        </div>
      </Section>

      <Section name="Statistic">
        <div style={{ display: 'flex', gap: 48 }}>
          <Statistic label="Open RFQs" value="128" delta="+12% this month" />
          <Statistic label="Avg. reply time" value="1.8 d" delta="-0.4 d" trend="down" />
        </div>
      </Section>

      <Section name="Tag">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag>Rice</Tag>
          <Tag>Halal</Tag>
          <Tag onRemove={() => {}}>ISO 22000</Tag>
          <Tag mono>HS 1006.30</Tag>
        </div>
      </Section>

      <Section name="Timeline">
        <div style={{ maxWidth: 420 }}>
          <Timeline>
            <TimelineItem
              status="done"
              icon="check"
              title="Production complete"
              meta="12 Nov 2026 · Al Noor Foods"
            />
            <TimelineItem
              status="now"
              icon="ship"
              title="Shipment in transit"
              badge={
                <Badge tone="info" icon="info">
                  In progress
                </Badge>
              }
              text="Vessel departs Karachi 20 Nov."
            />
            <TimelineItem icon="package" title="Customs clearance" meta="Pending" />
          </Timeline>
        </div>
      </Section>

      <Section name="Alert">
        <div style={{ display: 'grid', gap: 12 }}>
          <Alert title="Documents are visible to verified importers">
            Unverified companies can see the list but not open files.
          </Alert>
          <Alert tone="success" title="Verification approved">
            Your business registration level is active until 12 Mar 2027.
          </Alert>
          <Alert tone="warning" title="Quotation expires in 2 days">
            Extend validity or the importer can no longer accept it.
          </Alert>
          <Alert tone="danger" title="2 fields need attention">
            Add a delivery port and quantity before you publish.
          </Alert>
        </div>
      </Section>

      <Section name="Badge">
        <div>
          <h4 style={BADGE_LABEL}>TONES</h4>
          <div style={BADGE_ROW}>
            {TONES.map((tone) => (
              <Badge key={tone} tone={tone} className="capitalize">
                {tone}
              </Badge>
            ))}
            <Badge pill tone="info">
              12 new
            </Badge>
            <Badge large tone="success" icon="ok">
              Large
            </Badge>
          </div>
          {BADGE_GROUPS.map(([title, items]) => (
            <div key={title}>
              <h4 style={BADGE_LABEL}>{title}</h4>
              <div style={BADGE_ROW}>
                {items.map(([tone, label]) => (
                  <Badge key={label} tone={tone} icon={TONE_ICON[tone]}>
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section name="Toast">
        <ToastProvider>
          <Toast duration={Infinity} title="Quotation sent">
            QT-2026-0412 was sent to Al Noor Trading.
          </Toast>
          <Toast duration={Infinity} tone="danger" title="Upload failed">
            coa-batch-77.pdf is over 10 MB.{' '}
            <a className="sa-link" href="#">
              Choose another file
            </a>
          </Toast>
          <ToastViewport className="bg-ground !p-3 rounded-xl" />
        </ToastProvider>
      </Section>

      <Section name="Progress">
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0,1fr)', maxWidth: 420 }}>
          <div>
            <div style={{ ...progressLabel, display: 'flex', justifyContent: 'space-between' }}>
              <span>certificate-iso22000.pdf</span>
              <span className="sa-mono">64%</span>
            </div>
            <Progress value={64} aria-label="certificate-iso22000.pdf upload" />
          </div>
          <div>
            <div style={progressLabel}>Processing…</div>
            <Progress aria-label="Processing" />
          </div>
        </div>
      </Section>

      <Section name="Skeleton">
        <Card flush aria-busy="true" style={{ maxWidth: 320 }}>
          <Skeleton shape="block" style={{ borderRadius: 0, height: 160 }} />
          <CardBody>
            <Skeleton shape="title" />
            <Skeleton style={{ width: '90%' }} />
            <Skeleton style={{ width: '70%' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <Skeleton shape="circle" style={{ width: 32, height: 32 }} />
              <Skeleton style={{ width: '40%' }} />
            </div>
          </CardBody>
        </Card>
      </Section>

      <Section name="Spinner">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', color: 'var(--action)' }}>
          <Spinner aria-label="Loading" />
          <Spinner large aria-label="Loading" />
          <span style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--card-text)' }}>
            <Spinner aria-hidden="true" />
            Loading quotations…
          </span>
        </div>
        <div
          className="sa-ground"
          style={{
            padding: 20,
            marginTop: 8,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            borderRadius: 12,
          }}
        >
          <Spinner aria-label="Loading" />
          On navy ground
        </div>
      </Section>
    </>
  );
}
