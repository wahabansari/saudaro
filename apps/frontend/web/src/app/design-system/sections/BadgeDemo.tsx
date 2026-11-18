import type { CSSProperties } from 'react';
import { Badge, StatusBadge } from '@/components/ui/Badge';

const groupStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8, margin: '6px 0 16px' };
const headingStyle: CSSProperties = {
  margin: 0,
  font: '600 12px/16px var(--font-mono)',
  color: 'var(--card-muted)',
};

const RFQ = ['draft', 'published', 'paused', 'closed', 'expired', 'cancelled', 'awarded'] as const;
const QUOTATION = [
  'draft',
  'submitted',
  'under_negotiation',
  'accepted',
  'rejected',
  'withdrawn',
  'expired',
  'superseded',
] as const;
const DEAL = [
  'active',
  'in_production',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'disputed',
] as const;
const VERIFICATION = [
  'draft',
  'submitted',
  'in_review',
  'needs_info',
  'approved',
  'rejected',
  'expired',
  'revoked',
] as const;

export function BadgeDemo() {
  return (
    <div>
      <h4 style={headingStyle}>TONES</h4>
      <div style={groupStyle}>
        <Badge tone="neutral">Neutral</Badge>
        <Badge tone="info">Info</Badge>
        <Badge tone="success">Success</Badge>
        <Badge tone="warning">Warning</Badge>
        <Badge tone="danger">Danger</Badge>
        <Badge tone="outline">Outline</Badge>
        <Badge tone="solid">Solid</Badge>
        <Badge tone="info" pill>
          12 new
        </Badge>
        <Badge tone="success" size="lg" icon="ok">
          Large
        </Badge>
      </div>
      <h4 style={headingStyle}>RFQ STATUS</h4>
      <div style={groupStyle}>
        {RFQ.map((status) => (
          <StatusBadge key={status} kind="rfq" status={status} />
        ))}
      </div>
      <h4 style={headingStyle}>QUOTATION STATUS</h4>
      <div style={groupStyle}>
        {QUOTATION.map((status) => (
          <StatusBadge key={status} kind="quotation" status={status} />
        ))}
      </div>
      <h4 style={headingStyle}>DEAL STATUS</h4>
      <div style={groupStyle}>
        {DEAL.map((status) => (
          <StatusBadge key={status} kind="deal" status={status} />
        ))}
      </div>
      <h4 style={headingStyle}>VERIFICATION CASE STATUS</h4>
      <div style={groupStyle}>
        {VERIFICATION.map((status) => (
          <StatusBadge key={status} kind="verification" status={status} />
        ))}
      </div>
    </div>
  );
}
