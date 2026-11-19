import type { NegotiationItem } from '@/components/ui/NegotiationThread';

export const NEGOTIATION_THREADS: Record<string, NegotiationItem[]> = {
  'QT-2026-0412': [
    { kind: 'day', id: 'day-1', label: '14 Nov 2026' },
    {
      kind: 'message',
      id: 'msg-1',
      text: 'Can you do USD 1,190 for 300 MT if we take FOB Karachi?',
      author: 'Gulf Foods',
      time: '10:42',
    },
    {
      kind: 'offer',
      id: 'offer-1',
      mine: true,
      title: 'Counter offer',
      changes: [
        { label: 'Price per MT', before: 'USD 1,240.00', after: 'USD 1,215.00' },
        { label: 'Quantity', before: '250 MT', after: '300 MT' },
      ],
      author: 'You',
      time: '11:05',
    },
    {
      kind: 'message',
      id: 'msg-2',
      mine: true,
      text: 'Revised offer attached. Certificates are in the product documents.',
      author: 'You',
      time: '11:06',
    },
    { kind: 'event', id: 'event-1', text: 'Revision 2 submitted' },
  ],
};

export const threadFor = (quotationId: string): NegotiationItem[] => NEGOTIATION_THREADS[quotationId] ?? [];
