'use client';

import type { CSSProperties } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardLink } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Divider } from '@/components/ui/Divider';
import { Placeholder } from '@/components/ui/Placeholder';
import { Progress } from '@/components/ui/Progress';
import { Rating } from '@/components/ui/Rating';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { Statistic } from '@/components/ui/Statistic';
import { Tag } from '@/components/ui/Tag';
import { Timeline, TimelineItem } from '@/components/ui/Timeline';
import { Toast, ToastProvider, ToastViewport } from '@/components/ui/Toast';
import { BadgeDemo } from './BadgeDemo';
import { DemoSection } from './DemoSection';

const cardTitle: CSSProperties = { font: '600 18px/26px var(--font-sans)' };
const cardText: CSSProperties = { margin: '8px 0 0' };
const progressHead: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  font: '500 14px/20px var(--font-sans)',
  marginBottom: 6,
};
const toastViewport: CSSProperties = {
  position: 'static',
  display: 'grid',
  alignItems: 'normal',
  gap: 12,
  padding: 12,
  background: 'var(--ground)',
  borderRadius: 12,
};

const noop = () => undefined;

export function DisplaySection() {
  return (
    <div className="grid gap-10">
      <DemoSection name="Avatar">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Avatar size="sm">KR</Avatar>
          <Avatar>MW</Avatar>
          <Avatar size="lg">AN</Avatar>
          <Avatar variant="solid">GF</Avatar>
          <Avatar shape="square" size="lg">
            AN
          </Avatar>
        </div>
      </DemoSection>

      <DemoSection name="Card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          <Card>
            <h3 style={cardTitle}>Static card</h3>
            <p className="sa-muted" style={cardText}>
              Groups related content with a a 2px border and 12px radius.
            </p>
          </Card>
          <CardLink href="#">
            <h3 style={cardTitle}>Interactive card</h3>
            <p className="sa-muted" style={cardText}>
              Lifts on hover. The whole card is one link.
            </p>
          </CardLink>
        </div>
      </DemoSection>

      <DemoSection name="Chip">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip pressed>Rice</Chip>
          <Chip>Spices</Chip>
          <Chip>Textiles</Chip>
          <Chip icon="filter">More filters</Chip>
        </div>
      </DemoSection>

      <DemoSection name="Divider">
        <div style={{ maxWidth: 420 }}>
          <div>Payment terms</div>
          <Divider />
          <Divider>or continue with</Divider>
        </div>
      </DemoSection>

      <DemoSection name="Rating">
        <Rating value={4.6} reviews={128} />
      </DemoSection>

      <DemoSection name="Statistic">
        <div style={{ display: 'flex', gap: 48 }}>
          <Statistic label="Open RFQs" value="128" delta="+12% this month" />
          <Statistic label="Avg. reply time" value="1.8 d" delta="-0.4 d" trend="down" />
        </div>
      </DemoSection>

      <DemoSection name="Tag">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag>Rice</Tag>
          <Tag>Halal</Tag>
          <Tag onRemove={noop}>ISO 22000</Tag>
          <Tag className="sa-mono">HS 1006.30</Tag>
        </div>
      </DemoSection>

      <DemoSection name="Timeline">
        <div style={{ maxWidth: 420 }}>
          <Timeline>
            <TimelineItem state="done" title="Production complete" meta="12 Nov 2026 · Al Noor Foods" />
            <TimelineItem
              state="now"
              icon="ship"
              title={
                <>
                  Shipment in transit{' '}
                  <Badge tone="info" icon="info">
                    In progress
                  </Badge>
                </>
              }
              text="Vessel departs Karachi 20 Nov."
            />
            <TimelineItem icon="package" title="Customs clearance" meta="Pending" />
          </Timeline>
        </div>
      </DemoSection>

      <DemoSection name="Alert">
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
      </DemoSection>

      <DemoSection name="Badge">
        <BadgeDemo />
      </DemoSection>

      <DemoSection name="Toast">
        <ToastProvider duration={Infinity}>
          <Toast open title="Quotation sent">
            QT-2026-0412 was sent to Al Noor Trading.
          </Toast>
          <Toast open tone="danger" title="Upload failed">
            coa-batch-77.pdf is over 10 MB.{' '}
            <a className="sa-link" href="#">
              Choose another file
            </a>
          </Toast>
          <ToastViewport style={toastViewport} />
        </ToastProvider>
      </DemoSection>

      <DemoSection name="Progress">
        <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
          <div>
            <div style={progressHead}>
              <span id="ds-progress-file">certificate-iso22000.pdf</span>
              <span className="sa-mono">64%</span>
            </div>
            <Progress value={64} aria-labelledby="ds-progress-file" />
          </div>
          <div>
            <div style={{ font: '500 14px/20px var(--font-sans)', marginBottom: 6 }}>Processing…</div>
            <Progress aria-label="Processing" />
          </div>
        </div>
      </DemoSection>

      <DemoSection name="Skeleton">
        <Card flush aria-busy="true" style={{ maxWidth: 320 }}>
          <Skeleton variant="block" style={{ borderRadius: 0, height: 160 }} />
          <CardBody>
            <Skeleton variant="title" />
            <Skeleton style={{ width: '90%' }} />
            <Skeleton style={{ width: '70%' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <Skeleton variant="circle" style={{ width: 32, height: 32 }} />
              <Skeleton style={{ width: '40%' }} />
            </div>
          </CardBody>
        </Card>
      </DemoSection>

      <DemoSection name="Spinner">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', color: 'var(--action)' }}>
          <Spinner />
          <Spinner size="lg" />
          <span style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--card-text)' }}>
            <Spinner aria-hidden="true" aria-label={undefined} />
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
          <Spinner />
          On navy ground
        </div>
      </DemoSection>

      <DemoSection name="Placeholder">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <Placeholder style={{ width: 200, borderRadius: 12 }} />
          <Avatar shape="square">AG</Avatar>
          <Avatar>MW</Avatar>
          <Avatar size="sm">KR</Avatar>
        </div>
      </DemoSection>
    </div>
  );
}
