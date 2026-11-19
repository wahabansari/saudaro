export type RfqStatus = 'draft' | 'published' | 'paused' | 'closed' | 'expired' | 'cancelled' | 'awarded';
export type QuotationStatus =
  | 'draft'
  | 'submitted'
  | 'under_negotiation'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired'
  | 'superseded';
export type DealStatus =
  'active' | 'in_production' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'disputed';
export type ProductStatus = 'draft' | 'published' | 'paused';
export type DocumentState = 'valid' | 'sample' | 'expired' | 'restricted';
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'suspended';

export type EnumOption = { value: string; label: string };

export const RFQ_STATUS_OPTIONS: EnumOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'awarded', label: 'Awarded' },
];

export const QUOTATION_STATUS_OPTIONS: EnumOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_negotiation', label: 'Under negotiation' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'expired', label: 'Expired' },
  { value: 'superseded', label: 'Superseded' },
];

export const DEAL_STATUS_OPTIONS: EnumOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'in_production', label: 'In production' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'disputed', label: 'Disputed' },
];

export const PRODUCT_STATUS_OPTIONS: EnumOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'paused', label: 'Paused' },
];

export const DOCUMENT_STATE_OPTIONS: EnumOption[] = [
  { value: 'valid', label: 'Valid' },
  { value: 'sample', label: 'Sample' },
  { value: 'expired', label: 'Expired' },
  { value: 'restricted', label: 'Restricted' },
];

export const MEMBER_ROLE_OPTIONS: EnumOption[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

export const MEMBER_STATUS_OPTIONS: EnumOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'suspended', label: 'Suspended' },
];

export const labelOf = (options: EnumOption[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;
