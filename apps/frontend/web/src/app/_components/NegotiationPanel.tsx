'use client';

import { NegotiationThread, type NegotiationThreadProps } from '@/components/ui/NegotiationThread';

export type NegotiationPanelProps = Pick<
  NegotiationThreadProps,
  'reference' | 'title' | 'statusLabel' | 'items'
>;

export function NegotiationPanel(props: NegotiationPanelProps) {
  return <NegotiationThread {...props} composerId="negotiation-message" />;
}
